/**
 * @file Bcrypt.cpp
 * @brief bcrypt hashing: Eksblowfish setup + magic-cipher + crypt framing.
 */
#include "crypto/Bcrypt.h"
#include "crypto/Blowfish.h"
#include "crypto/BcryptBase64.h"

#include <openssl/rand.h>

#include <cstdio>
#include <cstring>

namespace vault::crypto
{

// "OrpheanBeholderScryDoubt" — the 24-byte (6 word) bcrypt magic, big-endian.
static void loadMagic(uint32_t out[6])
{
    static const char magic[25] = "OrpheanBeholderScryDoubt";
    for (int i = 0; i < 6; ++i)
        out[i] = ((uint32_t)(uint8_t)magic[i * 4] << 24) |
                 ((uint32_t)(uint8_t)magic[i * 4 + 1] << 16) |
                 ((uint32_t)(uint8_t)magic[i * 4 + 2] << 8) |
                 (uint32_t)(uint8_t)magic[i * 4 + 3];
}

std::string bcryptHash(const std::string& password, const std::string& setting)
{
    if (setting.size() < 29 || setting.compare(0, 1, "$") != 0 ||
        setting[3] != '$')
        return "";
    int cost = (setting[4] - '0') * 10 + (setting[5] - '0');
    if (cost < 4 || cost > 31 || setting[6] != '$')
        return "";

    auto salt = bcryptB64Decode(setting.substr(7, 22), 16);
    if (salt.size() != 16)
        return "";

    // Key = password bytes + trailing NUL (OpenBSD includes the terminator).
    std::string key = password;
    key.push_back('\0');
    int keyLen = (int)key.size();
    if (keyLen > 72)
        keyLen = 72;

    Blowfish bf;
    bf.expandKey(salt.data(), 16, (const uint8_t*)key.data(), keyLen);
    uint64_t rounds = 1ULL << cost;
    for (uint64_t i = 0; i < rounds; ++i) {
        bf.expand0((const uint8_t*)key.data(), keyLen);
        bf.expand0(salt.data(), 16);
    }

    uint32_t cdata[6];
    loadMagic(cdata);
    for (int k = 0; k < 64; ++k)
        for (int i = 0; i < 6; i += 2)
            bf.encipher(cdata[i], cdata[i + 1]);

    uint8_t ct[24];
    for (int i = 0; i < 6; ++i) {
        ct[i * 4] = (uint8_t)(cdata[i] >> 24);
        ct[i * 4 + 1] = (uint8_t)(cdata[i] >> 16);
        ct[i * 4 + 2] = (uint8_t)(cdata[i] >> 8);
        ct[i * 4 + 3] = (uint8_t)cdata[i];
    }

    char prefix[8];
    snprintf(prefix, sizeof prefix, "$2b$%02d$", cost);
    return std::string(prefix) + bcryptB64Encode(salt.data(), 16) +
           bcryptB64Encode(ct, 23); // bcrypt drops the last ciphertext byte
}

std::string bcryptGenSalt(int cost)
{
    if (cost < 4) cost = 4;
    if (cost > 31) cost = 31;
    uint8_t raw[16];
    RAND_bytes(raw, sizeof raw);
    char prefix[8];
    snprintf(prefix, sizeof prefix, "$2b$%02d$", cost);
    return std::string(prefix) + bcryptB64Encode(raw, 16);
}

std::string bcryptHashpw(const std::string& password, int cost)
{
    return bcryptHash(password, bcryptGenSalt(cost));
}

} // namespace vault::crypto
