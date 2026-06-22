/**
 * @file DbSha512Adapter.cpp
 * @brief UPDATE an unsalted SHA-512 password hash in a container's SQLite DB.
 *        The digest is computed natively; only the UPDATE runs in-container.
 */
#include "rotator/Adapters.h"
#include "rotator/AdapterUtil.h"
#include "rotator/DockerExec.h"
#include "crypto/Hashing.h"

#include <stdexcept>

namespace vault::rotator
{

void DbSha512Adapter::rotate(const Json::Value& p,
                             const std::string& newPassword)
{
    std::string hash = crypto::sha512Hex(newPassword);
    std::string code =
        "import sqlite3; conn = sqlite3.connect(" +
        pyRepr(requireParam(p, "db_path")) + "); conn.execute('UPDATE " +
        requireParam(p, "table") + " SET " + requireParam(p, "hash_column") +
        "=? WHERE " + requireParam(p, "username_column") + "=?', (" +
        pyRepr(hash) + ", " + pyRepr(requireParam(p, "username")) +
        ")); conn.commit(); conn.close(); print('ok')";
    if (dockerPython(requireParam(p, "db_container"), code).find("ok") ==
        std::string::npos)
        throw std::runtime_error("unexpected output from sqlite update");
}

Json::Value DbSha512Adapter::status(const Json::Value& p)
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
