/**
 * @file CredentialStore.h
 * @brief Postgres-backed encrypted credential + metadata store.
 *
 * Secrets are AES-256-GCM sealed with the session's master key and held as
 * base64 text columns. Mirrors the prior SQLite vault.db semantics.
 */
#pragma once

#include "crypto/Crypto.h"

#include <json/json.h>

#include <optional>
#include <string>

namespace vault
{

/// @brief CRUD over the `credentials` and `vault_meta` tables.
class CredentialStore
{
  public:
    /// @brief Read a meta value by key.
    static std::optional<std::string> meta(const std::string& key);
    static void setMeta(const std::string& key, const std::string& value);

    /// @brief Decrypt a stored secret, falling back to rotated.env / env files
    ///        (matches the manifest target fallback chain).
    static std::string readStored(const crypto::Bytes& aesKey,
                                  const std::string& name,
                                  const std::string& fallbackEnvKey = "",
                                  const std::string& fallbackEnvFile = "");

    /// @brief Seal and upsert a secret for @p name.
    static void store(const crypto::Bytes& aesKey, const std::string& name,
                      const std::string& badge, const std::string& rotateUrl,
                      const std::string& password);

    static void remove(const std::string& name);

    /// @brief Recent rotations: [{name, badge, updated_at}], newest first.
    static Json::Value history(int limit = 50);
};

} // namespace vault
