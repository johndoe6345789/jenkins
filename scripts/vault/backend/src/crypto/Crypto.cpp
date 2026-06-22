/**
 * @file Crypto.cpp
 * @brief AES-256-GCM + PBKDF2 master-key derivation.
 */
#include "crypto/Crypto.h"

#include <openssl/evp.h>
#include <openssl/rand.h>

#include <stdexcept>

namespace vault::crypto
{

static constexpr int kTagLen = 16;
static constexpr int kNonceLen = 12;

Bytes deriveKey(const std::string& password, const Bytes& salt)
{
    Bytes key(32);
    PKCS5_PBKDF2_HMAC(password.data(), (int)password.size(), salt.data(),
                      (int)salt.size(), 600000, EVP_sha256(), 32, key.data());
    return key;
}

Sealed encrypt(const Bytes& key, const std::string& plaintext)
{
    Sealed out;
    out.nonce.resize(kNonceLen);
    RAND_bytes(out.nonce.data(), kNonceLen);

    EVP_CIPHER_CTX* ctx = EVP_CIPHER_CTX_new();
    if (!ctx)
        throw std::runtime_error("EVP_CIPHER_CTX_new failed");

    out.ciphertext.resize(plaintext.size() + kTagLen);
    int len = 0, total = 0;
    EVP_EncryptInit_ex(ctx, EVP_aes_256_gcm(), nullptr, nullptr, nullptr);
    EVP_CIPHER_CTX_ctrl(ctx, EVP_CTRL_GCM_SET_IVLEN, kNonceLen, nullptr);
    EVP_EncryptInit_ex(ctx, nullptr, nullptr, key.data(), out.nonce.data());
    EVP_EncryptUpdate(ctx, out.ciphertext.data(), &len,
                      (const uint8_t*)plaintext.data(), (int)plaintext.size());
    total = len;
    EVP_EncryptFinal_ex(ctx, out.ciphertext.data() + total, &len);
    total += len;
    EVP_CIPHER_CTX_ctrl(ctx, EVP_CTRL_GCM_GET_TAG, kTagLen,
                        out.ciphertext.data() + total);
    EVP_CIPHER_CTX_free(ctx);
    return out;
}

std::string decrypt(const Bytes& key, const Bytes& ciphertext,
                    const Bytes& nonce)
{
    if ((int)ciphertext.size() < kTagLen)
        throw std::runtime_error("ciphertext too short");
    int bodyLen = (int)ciphertext.size() - kTagLen;

    EVP_CIPHER_CTX* ctx = EVP_CIPHER_CTX_new();
    if (!ctx)
        throw std::runtime_error("EVP_CIPHER_CTX_new failed");

    std::string out(bodyLen, '\0');
    int len = 0, total = 0;
    EVP_DecryptInit_ex(ctx, EVP_aes_256_gcm(), nullptr, nullptr, nullptr);
    EVP_CIPHER_CTX_ctrl(ctx, EVP_CTRL_GCM_SET_IVLEN, kNonceLen, nullptr);
    EVP_DecryptInit_ex(ctx, nullptr, nullptr, key.data(), nonce.data());
    EVP_DecryptUpdate(ctx, (uint8_t*)out.data(), &len, ciphertext.data(),
                      bodyLen);
    total = len;
    EVP_CIPHER_CTX_ctrl(ctx, EVP_CTRL_GCM_SET_TAG, kTagLen,
                        (void*)(ciphertext.data() + bodyLen));
    int ok = EVP_DecryptFinal_ex(ctx, (uint8_t*)out.data() + total, &len);
    EVP_CIPHER_CTX_free(ctx);
    if (ok <= 0)
        throw std::runtime_error("GCM authentication failed");
    out.resize(total + len);
    return out;
}

} // namespace vault::crypto
