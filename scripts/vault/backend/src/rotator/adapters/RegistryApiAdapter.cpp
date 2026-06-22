/**
 * @file RegistryApiAdapter.cpp
 * @brief Rotate a packagerepo/registry user via the backend's /auth REST API
 *        (login then change-password). Used for the :5001 Docker registry,
 *        whose PgUserStore hash is not reproducible by the DB adapters.
 *
 * params keys:
 *   api_url    (str)  backend base URL, e.g. http://localhost:5001
 *   username   (str)  registry user to rotate, e.g. admin
 *   env_file   (str)  path under the repo root holding the current password
 *   env_key    (str)  key in that file, e.g. PACKAGEREPO_REGISTRY_PASSWORD
 *   verify_ssl (bool) default true
 */
#include "rotator/Adapters.h"
#include "rotator/AdapterUtil.h"
#include "rotator/Http.h"
#include "services/EnvFile.h"
#include "services/Paths.h"

#include <stdexcept>

namespace vault::rotator
{

static bool verifySsl(const Json::Value& p)
{
    return p.isMember("verify_ssl") ? p["verify_ssl"].asBool() : true;
}

static std::string apiUrl(const Json::Value& p)
{
    std::string u = requireParam(p, "api_url");
    while (!u.empty() && u.back() == '/')
        u.pop_back();
    return u;
}

// POST /auth/login {username,password} -> JWT token.
static std::string login(const Json::Value& p, const std::string& password)
{
    Json::Value body;
    body["username"] = requireParam(p, "username");
    body["password"] = password;
    auto r = httpRequest("POST", apiUrl(p) + "/auth/login",
                         {{"Content-Type", "application/json"}},
                         jsonCompact(body), "", !verifySsl(p));
    auto j = parseJson(r.body);
    if (!r.ok() || !j["token"].isString())
        throw std::runtime_error("registry login failed for " +
                                 param(p, "username"));
    return j["token"].asString();
}

void RegistryApiAdapter::rotate(const Json::Value& p,
                                const std::string& newPassword)
{
    auto path = Paths::repoRoot() / requireParam(p, "env_file");
    auto env = readEnv(path);
    std::string key = requireParam(p, "env_key");
    std::string current = env.count(key) ? env[key] : "";
    if (current.empty())
        throw std::runtime_error("current registry password not in " +
                                 path.string());

    std::string token = login(p, current);
    Json::Value body;
    body["old_password"] = current;
    body["new_password"] = newPassword;
    auto r = httpRequest("POST", apiUrl(p) + "/auth/change-password",
                         {{"Content-Type", "application/json"},
                          {"Authorization", "Bearer " + token}},
                         jsonCompact(body), "", !verifySsl(p));
    if (!r.ok())
        throw std::runtime_error("change-password failed: " + r.body);

    env[key] = newPassword;
    writeEnv(path, env);
}

Json::Value RegistryApiAdapter::status(const Json::Value& p)
{
    Json::Value out;
    try {
        auto path = Paths::repoRoot() / requireParam(p, "env_file");
        auto env = readEnv(path);
        std::string key = requireParam(p, "env_key");
        std::string current = env.count(key) ? env[key] : "";
        if (current.empty()) {
            out["accessible"] = false;
            out["error"] = "no password in " + param(p, "env_file");
            return out;
        }
        login(p, current);
        out["accessible"] = true;
        out["url"] = apiUrl(p);
        out["username"] = requireParam(p, "username");
    } catch (const std::exception& e) {
        out["accessible"] = false;
        out["error"] = e.what();
    }
    return out;
}

} // namespace vault::rotator
