/**
 * @file Adapters.h
 * @brief Declarations for every built-in rotation adapter.
 */
#pragma once

#include "rotator/Adapter.h"

namespace vault::rotator
{

#define VAULT_ADAPTER(Name)                                                    \
    class Name : public Adapter                                                \
    {                                                                          \
      public:                                                                  \
        void rotate(const Json::Value&, const std::string&) override;          \
        Json::Value status(const Json::Value&) override;                       \
    }

VAULT_ADAPTER(EnvVarAdapter);          ///< write KEY=value into a .env file
VAULT_ADAPTER(DbSha512Adapter);        ///< sqlite UPDATE, unsalted sha512
VAULT_ADAPTER(DbWerkzeugAdapter);      ///< sqlite UPDATE, werkzeug hash
VAULT_ADAPTER(DbBcryptAdapter);        ///< postgres UPSERT, bcrypt
VAULT_ADAPTER(DbBcryptSqliteAdapter);  ///< sqlite UPDATE, bcrypt
VAULT_ADAPTER(PyracmsPbkdf2Adapter);   ///< postgres UPDATE, PBKDF2 salt:hash
VAULT_ADAPTER(GrafanaApiAdapter);      ///< Grafana admin REST
VAULT_ADAPTER(KeycloakRealmAdapter);   ///< Keycloak admin REST
VAULT_ADAPTER(CaproverAdapter);        ///< CapRover dashboard REST

#undef VAULT_ADAPTER

} // namespace vault::rotator
