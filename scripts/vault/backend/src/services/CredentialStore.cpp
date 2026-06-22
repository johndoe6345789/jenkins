/**
 * @file CredentialStore.cpp
 * @brief Postgres credential/meta store implementation.
 */
#include "services/CredentialStore.h"
#include "services/DbPool.h"
#include "services/EnvFile.h"
#include "services/Paths.h"

#include <drogon/utils/Utilities.h>

#include <chrono>
#include <ctime>

namespace vault
{

using crypto::Bytes;

static std::string nowIso()
{
    auto t = std::chrono::system_clock::to_time_t(
        std::chrono::system_clock::now());
    char buf[32];
    std::strftime(buf, sizeof buf, "%Y-%m-%dT%H:%M:%S+00:00", std::gmtime(&t));
    return buf;
}

static std::string b64(const Bytes& b)
{
    return drogon::utils::base64Encode(b.data(), b.size());
}

static Bytes unb64(const std::string& s)
{
    std::string decoded = drogon::utils::base64Decode(s);
    return Bytes(decoded.begin(), decoded.end());
}

std::optional<std::string> CredentialStore::meta(const std::string& key)
{
    auto r = DbPool::get()->execSqlSync(
        "SELECT value FROM vault_meta WHERE key = $1", key);
    if (r.empty())
        return std::nullopt;
    return r[0]["value"].as<std::string>();
}

void CredentialStore::setMeta(const std::string& key, const std::string& value)
{
    DbPool::get()->execSqlSync(
        "INSERT INTO vault_meta (key, value) VALUES ($1, $2) "
        "ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
        key, value);
}

std::string CredentialStore::readStored(const Bytes& aesKey,
                                        const std::string& name,
                                        const std::string& fallbackEnvKey,
                                        const std::string& fallbackEnvFile)
{
    auto r = DbPool::get()->execSqlSync(
        "SELECT ciphertext, nonce FROM credentials WHERE name = $1", name);
    if (!r.empty()) {
        try {
            return crypto::decrypt(aesKey,
                                   unb64(r[0]["ciphertext"].as<std::string>()),
                                   unb64(r[0]["nonce"].as<std::string>()));
        } catch (...) {
            // fall through to env fallbacks
        }
    }
    if (!fallbackEnvKey.empty()) {
        auto rotated = readEnv(Paths::rotatedEnv());
        auto it = rotated.find(fallbackEnvKey);
        if (it != rotated.end() && !it->second.empty())
            return it->second;
        if (!fallbackEnvFile.empty()) {
            auto env = readEnv(Paths::secrets() / fallbackEnvFile);
            auto jt = env.find(fallbackEnvKey);
            if (jt != env.end())
                return jt->second;
        }
    }
    return "";
}

void CredentialStore::store(const Bytes& aesKey, const std::string& name,
                            const std::string& badge,
                            const std::string& rotateUrl,
                            const std::string& password)
{
    auto sealed = crypto::encrypt(aesKey, password);
    DbPool::get()->execSqlSync(
        "INSERT INTO credentials "
        "(name, badge, rotate_url, ciphertext, nonce, updated_at) "
        "VALUES ($1, $2, $3, $4, $5, $6) "
        "ON CONFLICT (name) DO UPDATE SET badge = EXCLUDED.badge, "
        "rotate_url = EXCLUDED.rotate_url, ciphertext = EXCLUDED.ciphertext, "
        "nonce = EXCLUDED.nonce, updated_at = EXCLUDED.updated_at",
        name, badge, rotateUrl, b64(sealed.ciphertext), b64(sealed.nonce),
        nowIso());
}

void CredentialStore::remove(const std::string& name)
{
    DbPool::get()->execSqlSync("DELETE FROM credentials WHERE name = $1", name);
}

Json::Value CredentialStore::history(int limit)
{
    // Inline the limit (trusted int): Drogon binds native ints in binary and
    // libpq rejects them here ("insufficient data left in message").
    auto r = DbPool::get()->execSqlSync(
        "SELECT name, badge, updated_at FROM credentials "
        "ORDER BY updated_at DESC LIMIT " +
        std::to_string(limit));
    Json::Value out(Json::arrayValue);
    for (const auto& row : r) {
        Json::Value e;
        e["name"] = row["name"].as<std::string>();
        e["badge"] = row["badge"].isNull() ? "" : row["badge"].as<std::string>();
        e["updated_at"] = row["updated_at"].as<std::string>();
        out.append(e);
    }
    return out;
}

} // namespace vault
