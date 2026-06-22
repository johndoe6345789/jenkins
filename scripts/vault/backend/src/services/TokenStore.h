/**
 * @file TokenStore.h
 * @brief In-memory session token → AES master key map. Keys live only in RAM,
 *        exactly as in the prior Flask vault (_token_keys).
 */
#pragma once

#include "crypto/Crypto.h"

#include <mutex>
#include <string>
#include <unordered_map>

namespace vault
{

/// @brief Thread-safe token registry issued at login, cleared at logout.
class TokenStore
{
  public:
    /// @brief Register @p key under a fresh random token; returns the token.
    static std::string create(const crypto::Bytes& key);

    /// @brief Look up the key for @p token; false if unknown.
    static bool lookup(const std::string& token, crypto::Bytes& key);

    static void erase(const std::string& token);

  private:
    static inline std::mutex mu_;
    static inline std::unordered_map<std::string, crypto::Bytes> keys_;
};

} // namespace vault
