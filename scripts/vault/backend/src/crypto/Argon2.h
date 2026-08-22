/**
 * @file Argon2.h
 * @brief PHC-encoded argon2id hashing, backed by OpenSSL's ARGON2ID KDF.
 */
#pragma once

#include <string>

namespace vault::crypto
{

/// @brief Hash @p password as argon2id and return the PHC string
///        `$argon2id$v=19$m=<kib>,t=<iter>,p=<lanes>$<salt>$<hash>`.
/// Defaults match DBAL's stored hashes (and the OWASP recommendation).
/// @throws std::runtime_error if OpenSSL lacks ARGON2ID or derivation fails.
std::string argon2idHash(const std::string& password,
                         unsigned memoryKib = 19456, unsigned iterations = 2,
                         unsigned parallelism = 1);

} // namespace vault::crypto
