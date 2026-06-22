/**
 * @file CredentialView.h
 * @brief Build API credential objects from manifest targets / custom entries,
 *        mirroring the Flask _credential_from_* helpers.
 */
#pragma once

#include "crypto/Crypto.h"
#include "services/CredentialStore.h"
#include "services/Manifest.h"

#include <algorithm>
#include <filesystem>
#include <set>
#include <string>

namespace vault
{

inline std::string jget(const Json::Value& v, const char* k,
                        const std::string& def = "")
{
    return v.isMember(k) && v[k].isString() ? v[k].asString() : def;
}

inline Json::Value credentialFromTarget(const crypto::Bytes& key,
                                        const Json::Value& t)
{
    const Json::Value& params = t["params"];
    std::string fbKey = jget(params, "env_key", jget(t, "secret_env_key"));
    std::string fbFile =
        std::filesystem::path(jget(params, "env_file")).filename().string();
    std::string name = t["name"].asString();

    Json::Value c;
    c["name"] = name;
    c["service_name"] = jget(t, "service_name", name);
    c["username"] = jget(t, "username");
    c["badge"] = jget(t, "badge", jget(t, "adapter"));
    c["password"] = CredentialStore::readStored(key, name, fbKey, fbFile);
    c["rotate_url"] = "/api/rotate/" + name;
    c["app_url"] = jget(t, "app_url");
    c["repo_path"] = jget(t, "repo_path");
    c["group"] = jget(t, "group");
    c["source"] = "manifest";
    return c;
}

inline Json::Value credentialFromCustom(const crypto::Bytes& key,
                                        const Json::Value& e)
{
    std::string name = e["name"].asString();
    Json::Value c;
    c["name"] = name;
    c["service_name"] = jget(e, "service_name");
    c["username"] = jget(e, "username");
    c["badge"] = jget(e, "badge", "manual");
    c["password"] = CredentialStore::readStored(key, name);
    c["rotate_url"] = "/api/rotate/" + name;
    c["app_url"] = jget(e, "app_url");
    c["repo_path"] = jget(e, "repo_path");
    c["group"] = jget(e, "group");
    c["source"] = "custom";
    return c;
}

inline std::string uniqueName(const std::string& service,
                              const std::string& username)
{
    std::set<std::string> taken;
    for (const auto& t : manifestTargets())
        taken.insert(t["name"].asString());
    for (const auto& e : readCustom())
        taken.insert(e["name"].asString());

    std::string base = service + "-" + username;
    std::transform(base.begin(), base.end(), base.begin(), ::tolower);
    std::replace(base.begin(), base.end(), ' ', '-');

    std::string name = base;
    int n = 2;
    while (taken.count(name))
        name = base + "-" + std::to_string(n++);
    return name;
}

} // namespace vault
