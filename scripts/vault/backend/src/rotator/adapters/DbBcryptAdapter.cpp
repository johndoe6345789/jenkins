/**
 * @file DbBcryptAdapter.cpp
 * @brief UPSERT a natively-computed bcrypt hash into a Postgres users table
 *        reached via `docker exec psql`.
 */
#include "rotator/Adapters.h"
#include "rotator/AdapterUtil.h"
#include "rotator/DockerExec.h"
#include "crypto/Bcrypt.h"

namespace vault::rotator
{

static int cost(const Json::Value& p)
{
    return p.isMember("bcrypt_cost") ? p["bcrypt_cost"].asInt() : 10;
}

void DbBcryptAdapter::rotate(const Json::Value& p,
                             const std::string& newPassword)
{
    std::string h = crypto::bcryptHashpw(newPassword, cost(p));
    std::string table = requireParam(p, "table");
    std::string userCol = requireParam(p, "username_column");
    std::string hashCol = requireParam(p, "hash_column");
    std::string user = sqlQuote(requireParam(p, "username"));

    std::string setClause = hashCol + " = EXCLUDED." + hashCol;
    if (p.isMember("updated_at_column"))
        setClause += ", " + p["updated_at_column"].asString() + " = now()";

    std::string sql = "INSERT INTO " + table + " (" + userCol + ", " + hashCol +
                      ") VALUES ('" + user + "', '" + sqlQuote(h) +
                      "') ON CONFLICT (" + userCol + ") DO UPDATE SET " +
                      setClause + ";";
    dockerPsql(requireParam(p, "db_container"), requireParam(p, "db_user"),
               requireParam(p, "db_name"), sql);
}

Json::Value DbBcryptAdapter::status(const Json::Value& p)
{
    std::string updCol = param(p, "updated_at_column", "NULL");
    std::string sql = "SELECT length(" + requireParam(p, "hash_column") + "), " +
                      updCol + " FROM " + requireParam(p, "table") + " WHERE " +
                      requireParam(p, "username_column") + " = '" +
                      sqlQuote(requireParam(p, "username")) + "';";

    Json::Value out;
    std::string user = requireParam(p, "username");
    try {
        std::string o = dockerPsql(requireParam(p, "db_container"),
                                   requireParam(p, "db_user"),
                                   requireParam(p, "db_name"), sql);
        if (o.empty()) {
            out["present"] = false;
            out["username"] = user;
        } else {
            auto bar = o.find('|');
            out["present"] = true;
            out["username"] = user;
            out["hash_len"] = std::stoi(o.substr(0, bar));
            out["updated_at"] =
                bar == std::string::npos ? "" : o.substr(bar + 1);
        }
    } catch (const std::exception& e) {
        out["present"] = false;
        out["error"] = e.what();
    }
    return out;
}

} // namespace vault::rotator
