/**
 * @file DbArgon2Adapter.cpp
 * @brief UPDATE an argon2id hash into a Postgres credential table reached via
 *        `docker exec psql` -- the shape DBAL's SSO store uses.
 *
 * Unlike DbBcryptAdapter this never inserts: DBAL's Credential rows carry
 * columns we have no business inventing (the account UUID, tenant), so a
 * missing row is an error rather than something to create.
 */
#include "crypto/Argon2.h"
#include "rotator/AdapterUtil.h"
#include "rotator/Adapters.h"
#include "rotator/DockerExec.h"

namespace vault::rotator
{
namespace
{
unsigned uparam(const Json::Value& p, const char* key, unsigned fallback)
{
    return p.isMember(key) ? static_cast<unsigned>(p[key].asUInt()) : fallback;
}

/// @brief Row selector; the optional tenant pair matters because the same
///        account name can exist under more than one tenant.
std::string whereClause(const Json::Value& p)
{
    std::string w = requireParam(p, "username_column") + " = '" +
                    sqlQuote(requireParam(p, "username")) + "'";
    if (p.isMember("tenant_column") && p.isMember("tenant"))
        w += " AND " + p["tenant_column"].asString() + " = '" +
             sqlQuote(p["tenant"].asString()) + "'";
    return w;
}
} // namespace

void DbArgon2Adapter::rotate(const Json::Value& p,
                             const std::string& newPassword)
{
    std::string h = crypto::argon2idHash(newPassword,
                                         uparam(p, "argon2_memory_kib", 19456),
                                         uparam(p, "argon2_iterations", 2),
                                         uparam(p, "argon2_parallelism", 1));

    std::string sql = "UPDATE " + requireParam(p, "table") + " SET " +
                      requireParam(p, "hash_column") + " = '" + sqlQuote(h) +
                      "' WHERE " + whereClause(p) + ";";

    std::string out = dockerPsql(requireParam(p, "db_container"),
                                 requireParam(p, "db_user"),
                                 requireParam(p, "db_name"), sql);
    if (out != "UPDATE 1")
        throw std::runtime_error("expected 'UPDATE 1' from psql but got '" +
                                 out + "' - no matching user/tenant row?");
}

Json::Value DbArgon2Adapter::status(const Json::Value& p)
{
    Json::Value out;
    out["username"] = requireParam(p, "username");

    std::string hashCol = requireParam(p, "hash_column");
    std::string sql = "SELECT length(" + hashCol + "), split_part(" + hashCol +
                      ", '$', 2) FROM " + requireParam(p, "table") + " WHERE " +
                      whereClause(p) + ";";
    try {
        std::string o = dockerPsql(requireParam(p, "db_container"),
                                   requireParam(p, "db_user"),
                                   requireParam(p, "db_name"), sql);
        if (o.empty()) {
            out["present"] = false;
            return out;
        }
        auto bar = o.find('|');
        out["present"] = true;
        out["hash_len"] = std::stoi(o.substr(0, bar));
        out["variant"] = bar == std::string::npos ? "" : o.substr(bar + 1);
    } catch (const std::exception& e) {
        out["present"] = false;
        out["error"] = e.what();
    }
    return out;
}

} // namespace vault::rotator
