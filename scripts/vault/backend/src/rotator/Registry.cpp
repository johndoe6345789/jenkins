/**
 * @file Registry.cpp
 * @brief Adapter name → implementation factory.
 */
#include "rotator/Registry.h"
#include "rotator/Adapters.h"

#include <functional>
#include <map>
#include <stdexcept>

namespace vault::rotator
{

std::unique_ptr<Adapter> makeAdapter(const std::string& name)
{
    static const std::map<std::string, std::function<std::unique_ptr<Adapter>()>>
        kFactories = {
            {"env_var", [] { return std::make_unique<EnvVarAdapter>(); }},
            {"db_sha512", [] { return std::make_unique<DbSha512Adapter>(); }},
            {"db_werkzeug", [] { return std::make_unique<DbWerkzeugAdapter>(); }},
            {"db_bcrypt", [] { return std::make_unique<DbBcryptAdapter>(); }},
            {"db_bcrypt_sqlite",
             [] { return std::make_unique<DbBcryptSqliteAdapter>(); }},
            {"pyracms_pbkdf2",
             [] { return std::make_unique<PyracmsPbkdf2Adapter>(); }},
            {"grafana_api", [] { return std::make_unique<GrafanaApiAdapter>(); }},
            {"keycloak_realm",
             [] { return std::make_unique<KeycloakRealmAdapter>(); }},
            {"caprover", [] { return std::make_unique<CaproverAdapter>(); }},
        };

    auto it = kFactories.find(name);
    if (it == kFactories.end())
        throw std::runtime_error("unknown adapter: " + name);
    return it->second();
}

} // namespace vault::rotator
