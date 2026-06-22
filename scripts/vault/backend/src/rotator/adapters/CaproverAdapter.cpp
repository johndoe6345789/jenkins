/**
 * @file CaproverAdapter.cpp
 * @brief Rotate the CapRover dashboard password via its REST API, persisting
 *        the new password back to the local env file for next time.
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

static std::string baseUrl(const Json::Value& p)
{
    std::string u = requireParam(p, "caprover_url");
    while (!u.empty() && u.back() == '/')
        u.pop_back();
    return u;
}

// POST {password} to /api/v2/login, returning the captain auth token.
static std::string caproverLogin(const Json::Value& p, const std::string& pw)
{
    Json::Value body;
    body["password"] = pw;
    auto r = httpRequest("POST", baseUrl(p) + "/api/v2/login",
                         {{"Content-Type", "application/json"}},
                         jsonCompact(body), "", !verifySsl(p));
    auto j = parseJson(r.body);
    if (j["status"].asInt() != 100)
        throw std::runtime_error("CapRover login failed: " +
                                 j["description"].asString());
    return j["data"]["token"].asString();
}

void CaproverAdapter::rotate(const Json::Value& p,
                             const std::string& newPassword)
{
    auto path = Paths::repoRoot() / requireParam(p, "env_file");
    auto env = readEnv(path);
    std::string key = requireParam(p, "env_key");
    std::string current = env.count(key) ? env[key] : "";
    if (current.empty())
        throw std::runtime_error("current CapRover password not in " +
                                 path.string());

    std::string token = caproverLogin(p, current);
    Json::Value body;
    body["oldPassword"] = current;
    body["newPassword"] = newPassword;
    auto r = httpRequest("POST", baseUrl(p) + "/api/v2/user/password",
                         {{"Content-Type", "application/json"},
                          {"x-captain-auth", token}},
                         jsonCompact(body), "", !verifySsl(p));
    if (!r.ok())
        throw std::runtime_error("CapRover password change failed: " + r.body);

    env[key] = newPassword;
    writeEnv(path, env);
}

Json::Value CaproverAdapter::status(const Json::Value& p)
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
        caproverLogin(p, current);
        out["accessible"] = true;
        out["url"] = baseUrl(p);
    } catch (const std::exception& e) {
        out["accessible"] = false;
        out["error"] = e.what();
    }
    return out;
}

} // namespace vault::rotator
