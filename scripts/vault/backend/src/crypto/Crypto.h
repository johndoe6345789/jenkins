/**
 * @file Crypto.h
 * @brief Vault master-key derivation + AES-256-GCM, compatible with the
 *        prior Python `cryptography` layout (ciphertext has the tag appended).
 */
#pragma once

#include <cstdint>
#include <string>
#include <vector>

namespace vault::crypto
{

using Bytes = std::vector<uint8_t>;

/// @brief PBKDF2-HMAC-SHA256, 600k iterations → 32-byte AES key.
Bytes deriveKey(const std::string& password, const Bytes& salt);

/// @brief AES-256-GCM encrypt. Output ciphertext = body||tag (16-byte tag).
///        Returns {ciphertext, nonce}; nonce is 12 random bytes.
struct Sealed
{
    Bytes ciphertext;
    Bytes nonce;
};
Sealed encrypt(const Bytes& key, const std::string& plaintext);

/// @brief AES-256-GCM decrypt of body||tag. Throws std::runtime_error on
///        authentication failure.
std::string decrypt(const Bytes& key, const Bytes& ciphertext,
                    const Bytes& nonce);

} // namespace vault::crypto
