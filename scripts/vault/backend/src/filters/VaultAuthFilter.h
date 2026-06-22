/**
 * @file VaultAuthFilter.h
 * @brief Drogon filter enforcing the X-Vault-Token session header.
 */
#pragma once

#include <drogon/HttpFilter.h>

namespace vault
{

/// @brief Rejects requests without a valid session token; on success stashes
///        the session AES key as the "aes_key" request attribute.
class VaultAuthFilter : public drogon::HttpFilter<VaultAuthFilter>
{
  public:
    void doFilter(const drogon::HttpRequestPtr& req,
                  drogon::FilterCallback&& cb,
                  drogon::FilterChainCallback&& ccb) override;
};

} // namespace vault
