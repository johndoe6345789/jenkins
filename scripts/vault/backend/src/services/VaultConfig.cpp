/**
 * @file VaultConfig.cpp
 * @brief Bootstrap implementation.
 */
#include "services/VaultConfig.h"
#include "services/CredentialStore.h"
#include "services/EnvFile.h"
#include "services/Paths.h"
#include "crypto/Hashing.h"

#include <openssl/rand.h>

#include <cstdio>
#include <filesystem>

namespace vault
{

// URL-safe-ish random token (alphanumeric), ~24 bytes of entropy.
static std::string randomToken(int n)
{
    static const char* a =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    std::string out;
    out.reserve(n);
    for (int i = 0; i < n; ++i) {
        uint8_t b;
        RAND_bytes(&b, 1);
        out += a[b & 63];
    }
    return out;
}

void VaultConfig::bootstrap()
{
    std::error_code ec;
    std::filesystem::create_directories(Paths::secrets(), ec);

    auto env = readEnv(Paths::vaultEnv());
    auto it = env.find("VAULT_MASTER_PASSWORD");
    if (it == env.end() || it->second.empty()) {
        std::string pw = randomToken(32);
        EnvMap m{{"VAULT_MASTER_PASSWORD", pw}};
        writeEnv(Paths::vaultEnv(), m);
        printf("\n[vault] Generated master password: %s\n", pw.c_str());
        printf("[vault] Saved to %s\n\n", Paths::vaultEnv().c_str());
        master_ = pw;
    } else {
        master_ = it->second;
    }

    if (!CredentialStore::meta("kdf_salt").has_value()) {
        uint8_t salt[16];
        RAND_bytes(salt, sizeof salt);
        CredentialStore::setMeta("kdf_salt", crypto::toHex(salt, sizeof salt));
    }
}

crypto::Bytes VaultConfig::saltBytes()
{
    auto hex = CredentialStore::meta("kdf_salt");
    return hex ? crypto::fromHex(*hex) : crypto::Bytes{};
}

} // namespace vault
