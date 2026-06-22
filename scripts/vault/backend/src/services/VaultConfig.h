/**
 * @file VaultConfig.h
 * @brief Master-password + KDF-salt bootstrap, mirroring the Flask _bootstrap.
 */
#pragma once

#include "crypto/Crypto.h"

#include <string>

namespace vault
{

/// @brief Process-wide vault configuration loaded once at startup.
class VaultConfig
{
  public:
    /// @brief Ensure the master password (secrets/vault.env) and the KDF salt
    ///        (vault_meta.kdf_salt) exist, generating them on first run.
    ///        Requires DbPool to be initialised.
    static void bootstrap();

    static const std::string& masterPassword() { return master_; }

    /// @brief The KDF salt bytes from vault_meta.kdf_salt.
    static crypto::Bytes saltBytes();

  private:
    static inline std::string master_;
};

} // namespace vault
