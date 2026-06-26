/**
 * @file GrafanaApiAdapter.cpp
 * @brief Set a Grafana user's password via the admin REST API (Basic auth).
 */
#include "rotator/Adapters.h"
#include "rotator/AdapterUtil.h"
#include "rotator/Http.h"
#include "services/EnvFile.h"
#include "services/Paths.h"

#include <cstdlib>
#include <stdexcept>

namespace vault::rotator
{

// rotated.env is authoritative; fall back to the process environment.
static std::string grafanaAdminPw(const Json::Value& p)
{
    std::string var = requireParam(p, "admin_password_env");
    auto rotated = readEnv(Paths::rotatedEnv());
    auto it = rotated.find(var);
    if (it != rotated.end() && !it->second.empty())
        return it->second;
    if (const char* env = std::getenv(var.c_str()))
        return env;
    throw std::runtime_error("admin password " + var +
                             " not in rotated.env or environment");
}

static long grafanaUserId(const Json::Value& p, const std::string& basic)
{
    std::string url = requireParam(p, "grafana_url") +
                      "/api/users/lookup?loginOrEmail=" +
                      urlEncode(requireParam(p, "login"));
    auto r = httpRequest("GET", url, {}, "", basic);
    auto j = parseJson(r.body);
    if (!r.ok() || !j.isMember("id")) {
        std::string why = r.status == 401 ? " (admin auth rejected — stale "
                          "admin password?)" : r.status
                          ? " (HTTP " + std::to_string(r.status) + ")"
                          : " (" + r.transportError + ")";
        throw std::runtime_error("Grafana user '" + param(p, "login") +
                                 "' lookup failed" + why);
    }
    return j["id"].asInt64();
}

void GrafanaApiAdapter::rotate(const Json::Value& p,
                               const std::string& newPassword)
{
    std::string basic = "admin:" + grafanaAdminPw(p);
    long uid = grafanaUserId(p, basic);
    Json::Value body;
    body["password"] = newPassword;
    auto r = httpRequest(
        "PUT",
        requireParam(p, "grafana_url") + "/api/admin/users/" +
            std::to_string(uid) + "/password",
        {{"Content-Type", "application/json"}}, jsonCompact(body), basic);
    if (!r.ok())
        throw std::runtime_error("Grafana password PUT failed: " + r.body);
}

Json::Value GrafanaApiAdapter::status(const Json::Value& p)
{
    Json::Value out;
    try {
        long uid = grafanaUserId(p, "admin:" + grafanaAdminPw(p));
        out["present"] = true;
        out["login"] = requireParam(p, "login");
        out["id"] = (Json::Int64)uid;
    } catch (const std::exception& e) {
        out["present"] = false;
        out["error"] = e.what();
    }
    return out;
}

} // namespace vault::rotator
