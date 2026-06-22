/**
 * @file TokenStore.cpp
 * @brief Session token store implementation.
 */
#include "services/TokenStore.h"
#include "crypto/Hashing.h"

#include <openssl/rand.h>

namespace vault
{

std::string TokenStore::create(const crypto::Bytes& key)
{
    uint8_t raw[32];
    RAND_bytes(raw, sizeof raw);
    std::string token = crypto::toHex(raw, sizeof raw);
    std::lock_guard<std::mutex> lock(mu_);
    keys_[token] = key;
    return token;
}

bool TokenStore::lookup(const std::string& token, crypto::Bytes& key)
{
    std::lock_guard<std::mutex> lock(mu_);
    auto it = keys_.find(token);
    if (it == keys_.end())
        return false;
    key = it->second;
    return true;
}

void TokenStore::erase(const std::string& token)
{
    std::lock_guard<std::mutex> lock(mu_);
    keys_.erase(token);
}

} // namespace vault
