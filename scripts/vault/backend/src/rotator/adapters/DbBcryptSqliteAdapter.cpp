/**
 * @file DbBcryptSqliteAdapter.cpp
 * @brief UPDATE a natively-computed bcrypt hash in a container's SQLite DB.
 */
#include "rotator/Adapters.h"
#include "rotator/AdapterUtil.h"
#include "rotator/DockerExec.h"
#include "crypto/Bcrypt.h"

#include <chrono>
#include <ctime>
#include <stdexcept>

namespace vault::rotator
{

static std::string nowIso()
{
    auto t = std::chrono::system_clock::to_time_t(
        std::chrono::system_clock::now());
    char buf[32];
    std::strftime(buf, sizeof buf, "%Y-%m-%dT%H:%M:%S+00:00", std::gmtime(&t));
    return buf;
}

void DbBcryptSqliteAdapter::rotate(const Json::Value& p,
                                   const std::string& newPassword)
{
    int cost = p.isMember("bcrypt_cost") ? p["bcrypt_cost"].asInt() : 10;
    std::string h = crypto::bcryptHashpw(newPassword, cost);
    std::string table = requireParam(p, "table");
    std::string userCol = requireParam(p, "username_column");
    std::string user = pyRepr(requireParam(p, "username"));

    std::string code = "import sqlite3; conn = sqlite3.connect(" +
                       pyRepr(requireParam(p, "db_path")) +
                       "); conn.execute('UPDATE " + table + " SET " +
                       requireParam(p, "hash_column") + "=? WHERE " + userCol +
                       "=?', (" + pyRepr(h) + ", " + user + "))";
    if (p.isMember("updated_at_column"))
        code += "; conn.execute('UPDATE " + table + " SET " +
                p["updated_at_column"].asString() + "=? WHERE " + userCol +
                "=?', (" + pyRepr(nowIso()) + ", " + user + "))";
    code += "; conn.commit(); conn.close(); print('ok')";

    if (dockerPython(requireParam(p, "db_container"), code).find("ok") ==
        std::string::npos)
        throw std::runtime_error("unexpected output from sqlite update");
}

Json::Value DbBcryptSqliteAdapter::status(const Json::Value& p)
{
    std::string code =
        "import sqlite3; conn = sqlite3.connect(" +
        pyRepr(requireParam(p, "db_path")) + "); row = conn.execute('SELECT " +
        requireParam(p, "hash_column") + " FROM " + requireParam(p, "table") +
        " WHERE " + requireParam(p, "username_column") + "=?', (" +
        pyRepr(requireParam(p, "username")) +
        ",)).fetchone(); conn.close(); print(len(row[0]) if row else 'NONE')";

    Json::Value out;
    std::string user = requireParam(p, "username");
    try {
        std::string o = dockerPython(requireParam(p, "db_container"), code);
        if (o == "NONE") {
            out["present"] = false;
            out["username"] = user;
        } else {
            out["present"] = true;
            out["username"] = user;
            out["hash_len"] = std::stoi(o);
        }
    } catch (const std::exception& e) {
        out["present"] = false;
        out["error"] = e.what();
    }
    return out;
}

} // namespace vault::rotator
