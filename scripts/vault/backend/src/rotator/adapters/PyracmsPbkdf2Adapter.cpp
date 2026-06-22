/**
 * @file PyracmsPbkdf2Adapter.cpp
 * @brief UPDATE a PyraCMS PBKDF2-SHA256 "saltHex:hashHex" password in Postgres.
 */
#include "rotator/Adapters.h"
#include "rotator/AdapterUtil.h"
#include "rotator/DockerExec.h"
#include "crypto/Hashing.h"

namespace vault::rotator
{

void PyracmsPbkdf2Adapter::rotate(const Json::Value& p,
                                  const std::string& newPassword)
{
    std::string hash = crypto::pyracmsHash(newPassword);
    std::string sql = "UPDATE users SET password_hash = '" + sqlQuote(hash) +
                      "' WHERE username = '" +
                      sqlQuote(requireParam(p, "username")) + "';";
    dockerPsql(requireParam(p, "db_container"), requireParam(p, "db_user"),
               requireParam(p, "db_name"), sql);
}

Json::Value PyracmsPbkdf2Adapter::status(const Json::Value& p)
{
    std::string sql = "SELECT id, length(password_hash) FROM users WHERE "
                      "username = '" +
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
            out["user_id"] = o.substr(0, bar);
            out["hash_len"] =
                bar == std::string::npos ? 0 : std::stoi(o.substr(bar + 1));
        }
    } catch (const std::exception& e) {
        out["present"] = false;
        out["error"] = e.what();
    }
    return out;
}

} // namespace vault::rotator
