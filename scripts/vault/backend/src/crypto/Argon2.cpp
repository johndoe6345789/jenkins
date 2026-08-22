/**
 * @file Argon2.cpp
 * @brief argon2id via OpenSSL 3.2+'s ARGON2ID KDF. No extra dependency: the
 *        backend already links OpenSSL for bcrypt/AES.
 */
#include "crypto/Argon2.h"

#include <openssl/core_names.h>
#include <openssl/evp.h>
#include <openssl/kdf.h>
#include <openssl/params.h>
#include <openssl/rand.h>

#include <stdexcept>
#include <string>

namespace vault::crypto
{
namespace
{
constexpr char kB64[] =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/// @brief Standard base64 with the padding stripped, as the PHC format wants.
std::string b64NoPad(const unsigned char* d, size_t n)
{
    std::string o;
    o.reserve((n + 2) / 3 * 4);
    for (size_t i = 0; i < n; i += 3) {
        unsigned v = static_cast<unsigned>(d[i]) << 16;
        if (i + 1 < n)
            v |= static_cast<unsigned>(d[i + 1]) << 8;
        if (i + 2 < n)
            v |= static_cast<unsigned>(d[i + 2]);
        o += kB64[(v >> 18) & 63];
        o += kB64[(v >> 12) & 63];
        if (i + 1 < n)
            o += kB64[(v >> 6) & 63];
        if (i + 2 < n)
            o += kB64[v & 63];
    }
    return o;
}
} // namespace

std::string argon2idHash(const std::string& password, unsigned memoryKib,
                         unsigned iterations, unsigned parallelism)
{
    unsigned char salt[16];
    if (RAND_bytes(salt, sizeof salt) != 1)
        throw std::runtime_error("argon2id: RAND_bytes failed");

    EVP_KDF* kdf = EVP_KDF_fetch(nullptr, "ARGON2ID", nullptr);
    if (kdf == nullptr)
        throw std::runtime_error(
            "argon2id: this OpenSSL build has no ARGON2ID KDF (needs 3.2+)");
    EVP_KDF_CTX* ctx = EVP_KDF_CTX_new(kdf);
    EVP_KDF_free(kdf);
    if (ctx == nullptr)
        throw std::runtime_error("argon2id: EVP_KDF_CTX_new failed");

    unsigned threads = 1; // lanes>1 would need OSSL_set_max_threads
    OSSL_PARAM params[7];
    size_t i = 0;
    params[i++] = OSSL_PARAM_construct_octet_string(
        OSSL_KDF_PARAM_PASSWORD, const_cast<char*>(password.data()),
        password.size());
    params[i++] = OSSL_PARAM_construct_octet_string(OSSL_KDF_PARAM_SALT, salt,
                                                    sizeof salt);
    params[i++] = OSSL_PARAM_construct_uint(OSSL_KDF_PARAM_ITER, &iterations);
    params[i++] =
        OSSL_PARAM_construct_uint(OSSL_KDF_PARAM_ARGON2_MEMCOST, &memoryKib);
    params[i++] =
        OSSL_PARAM_construct_uint(OSSL_KDF_PARAM_ARGON2_LANES, &parallelism);
    params[i++] = OSSL_PARAM_construct_uint(OSSL_KDF_PARAM_THREADS, &threads);
    params[i] = OSSL_PARAM_construct_end();

    unsigned char out[32];
    int rc = EVP_KDF_derive(ctx, out, sizeof out, params);
    EVP_KDF_CTX_free(ctx);
    if (rc <= 0)
        throw std::runtime_error("argon2id: EVP_KDF_derive failed");

    return "$argon2id$v=19$m=" + std::to_string(memoryKib) +
           ",t=" + std::to_string(iterations) +
           ",p=" + std::to_string(parallelism) + "$" +
           b64NoPad(salt, sizeof salt) + "$" + b64NoPad(out, sizeof out);
}

} // namespace vault::crypto
