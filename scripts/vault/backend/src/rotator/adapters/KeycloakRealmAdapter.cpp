/**
 * @file KeycloakRealmAdapter.cpp
 * @brief Reset a Keycloak realm user's password via the admin REST API.
 */
#include "rotator/Adapters.h"
#include "rotator/AdapterUtil.h"
#include "rotator/Http.h"

#include <cstdlib>
#include <stdexcept>

namespace vault::rotator
{

static std::string kcToken(const Json::Value& p)
{
    std::string var = requireParam(p, "kc_master_password_env");
    const char* pw = std::getenv(var.c_str());
    if (!pw)
        throw std::runtime_error("env var " + var + " is not set");

    std::string body = "client_id=admin-cli&grant_type=password&username=" +
                       urlEncode(param(p, "kc_master_user", "admin")) +
                       "&password=" + urlEncode(pw);
    auto r = httpRequest(
        "POST", requireParam(p, "kc_url") +
                    "/realms/master/protocol/openid-connect/token",
        {{"Content-Type", "application/x-www-form-urlencoded"}}, body);
    auto j = parseJson(r.body);
    if (!r.ok() || !j.isMember("access_token"))
        throw std::runtime_error("Keycloak token request failed");
    return j["access_token"].asString();
}

static Json::Value kcUsers(const Json::Value& p, const std::string& token)
{
    std::string url = requireParam(p, "kc_url") + "/admin/realms/" +
                      requireParam(p, "realm") + "/users?username=" +
                      urlEncode(requireParam(p, "user")) + "&exact=true";
    auto r = httpRequest("GET", url, {{"Authorization", "Bearer " + token}});
    return parseJson(r.body);
}

void KeycloakRealmAdapter::rotate(const Json::Value& p,
                                  const std::string& newPassword)
{
    std::string token = kcToken(p);
    auto users = kcUsers(p, token);
    if (!users.isArray() || users.empty())
        throw std::runtime_error("user " + param(p, "user") + " not found");
    std::string uid = users[0]["id"].asString();

    Json::Value body;
    body["type"] = "password";
    body["value"] = newPassword;
    body["temporary"] = false;
    auto r = httpRequest("PUT",
                         requireParam(p, "kc_url") + "/admin/realms/" +
                             requireParam(p, "realm") + "/users/" + uid +
                             "/reset-password",
                         {{"Authorization", "Bearer " + token},
                          {"Content-Type", "application/json"}},
                         jsonCompact(body), "");
    if (!r.ok())
        throw std::runtime_error("Keycloak reset-password failed: " + r.body);
}

Json::Value KeycloakRealmAdapter::status(const Json::Value& p)
{
    Json::Value out;
    try {
        auto users = kcUsers(p, kcToken(p));
        if (!users.isArray() || users.empty()) {
            out["present"] = false;
            out["realm"] = requireParam(p, "realm");
            out["user"] = requireParam(p, "user");
        } else {
            out["present"] = true;
            out["realm"] = requireParam(p, "realm");
            out["user"] = requireParam(p, "user");
            out["enabled"] = users[0]["enabled"];
            out["last_modified"] = users[0]["createdTimestamp"];
        }
    } catch (const std::exception& e) {
        out["present"] = false;
        out["error"] = e.what();
    }
    return out;
}

} // namespace vault::rotator
