/**
 * @file Hashing.h
 * @brief Small hex hashing helpers (sha512, PBKDF2) over OpenSSL.
 */
#pragma once

#include <openssl/evp.h>
#include <openssl/rand.h>
#include <openssl/sha.h>

#include <string>
#include <vector>

namespace vault::crypto
{

inline std::string toHex(const uint8_t* data, size_t n)
{
    static const char* h = "0123456789abcdef";
    std::string out;
    out.reserve(n * 2);
    for (size_t i = 0; i < n; ++i) {
        out += h[data[i] >> 4];
        out += h[data[i] & 0x0f];
    }
    return out;
}

inline std::vector<uint8_t> fromHex(const std::string& hex)
{
    std::vector<uint8_t> out;
    auto nib = [](char c) -> int {
        if (c >= '0' && c <= '9') return c - '0';
        if (c >= 'a' && c <= 'f') return c - 'a' + 10;
        if (c >= 'A' && c <= 'F') return c - 'A' + 10;
        return 0;
    };
    for (size_t i = 0; i + 1 < hex.size(); i += 2)
        out.push_back((uint8_t)((nib(hex[i]) << 4) | nib(hex[i + 1])));
    return out;
}

/// @brief Unsalted SHA-512 hex (matches hashlib.sha512(pw).hexdigest()).
inline std::string sha512Hex(const std::string& s)
{
    uint8_t md[SHA512_DIGEST_LENGTH];
    SHA512((const uint8_t*)s.data(), s.size(), md);
    return toHex(md, sizeof md);
}

/// @brief PBKDF2-HMAC-SHA256 → raw key bytes.
inline std::vector<uint8_t> pbkdf2Sha256(const std::string& pw,
                                         const uint8_t* salt, size_t saltLen,
                                         int iters, int dkLen)
{
    std::vector<uint8_t> out(dkLen);
    PKCS5_PBKDF2_HMAC(pw.data(), (int)pw.size(), salt, (int)saltLen, iters,
                      EVP_sha256(), dkLen, out.data());
    return out;
}

/// @brief PyraCMS hash: "saltHex:hashHex", 16-byte salt, 100k iters, 32-byte key.
inline std::string pyracmsHash(const std::string& password)
{
    uint8_t salt[16];
    RAND_bytes(salt, sizeof salt);
    auto dk = pbkdf2Sha256(password, salt, sizeof salt, 100000, 32);
    return toHex(salt, sizeof salt) + ":" + toHex(dk.data(), dk.size());
}

} // namespace vault::crypto
