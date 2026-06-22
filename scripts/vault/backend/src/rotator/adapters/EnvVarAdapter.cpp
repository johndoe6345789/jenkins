/**
 * @file EnvVarAdapter.cpp
 * @brief Write KEY=value into a .env file under the repo root. The consuming
 *        compose service must be recreated separately to pick it up.
 */
#include "rotator/Adapters.h"
#include "rotator/AdapterUtil.h"
#include "services/EnvFile.h"
#include "services/Paths.h"

namespace vault::rotator
{

static std::filesystem::path envPath(const Json::Value& p)
{
    return Paths::repoRoot() / requireParam(p, "env_file");
}

void EnvVarAdapter::rotate(const Json::Value& p, const std::string& newPassword)
{
    auto path = envPath(p);
    auto values = readEnv(path);
    values[requireParam(p, "env_key")] = newPassword;
    writeEnv(path, values);
}

Json::Value EnvVarAdapter::status(const Json::Value& p)
{
    auto path = envPath(p);
    Json::Value out;
    if (!std::filesystem::exists(path)) {
        out["present"] = false;
        out["env_file"] = path.string();
        return out;
    }
    auto values = readEnv(path);
    std::string key = requireParam(p, "env_key");
    out["present"] = values.count(key) > 0;
    out["env_file"] =
        std::filesystem::relative(path, Paths::repoRoot()).string();
    out["env_key"] = key;
    out["value_len"] = (Json::UInt)(values.count(key) ? values[key].size() : 0);
    if (p.isMember("recreate_service"))
        out["needs_recreate"] = p["recreate_service"];
    return out;
}

} // namespace vault::rotator
