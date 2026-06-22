/**
 * @file VaultAuthFilter.cpp
 * @brief Session-token filter implementation.
 */
#include "filters/VaultAuthFilter.h"
#include "services/TokenStore.h"

using namespace drogon;

namespace vault
{

void VaultAuthFilter::doFilter(const HttpRequestPtr& req, FilterCallback&& cb,
                               FilterChainCallback&& ccb)
{
    std::string token = req->getHeader("X-Vault-Token");
    crypto::Bytes key;
    if (token.empty() || !TokenStore::lookup(token, key)) {
        Json::Value err;
        err["error"] = "not authenticated";
        auto resp = HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(k401Unauthorized);
        cb(resp);
        return;
    }
    req->attributes()->insert("aes_key", key);
    ccb();
}

} // namespace vault
