/**
 * @file DbPool.h
 * @brief Shared Drogon PostgreSQL client for the vault store.
 */
#pragma once

#include <drogon/orm/DbClient.h>

#include <string>

namespace vault
{

/// @brief Owns the process-wide Postgres connection pool.
class DbPool
{
  public:
    static void init(const std::string& connStr, int conns = 2)
    {
        client_ = drogon::orm::DbClient::newPgClient(connStr, conns);
    }

    static drogon::orm::DbClientPtr& get() { return client_; }

  private:
    static inline drogon::orm::DbClientPtr client_;
};

} // namespace vault
