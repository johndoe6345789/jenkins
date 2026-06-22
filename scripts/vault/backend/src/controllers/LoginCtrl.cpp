/**
 * @file LoginCtrl.cpp
 * @brief Login/logout implementation.
 */
#include "controllers/LoginCtrl.h"
#include "controllers/ApiUtil.h"
#include "services/TokenStore.h"
#include "services/VaultConfig.h"
#include "crypto/Crypto.h"

using namespace drogon;

namespace vault
{

void LoginCtrl::login(const HttpRequestPtr& req,
                      std::function<void(const HttpResponsePtr&)>&& cb)
{
    auto json = req->getJsonObject();
    std::string pw =
        json && (*json)["password"].isString() ? (*json)["password"].asString()
                                                : "";
    if (pw != VaultConfig::masterPassword()) {
        cb(jsonError("Invalid password", k401Unauthorized));
        return;
    }
    auto salt = VaultConfig::saltBytes();
    if (salt.empty()) {
        cb(jsonError("vault not initialized", k500InternalServerError));
        return;
    }
    auto key = crypto::deriveKey(pw, salt);
    std::string token = TokenStore::create(key);

    Json::Value out;
    out["ok"] = true;
    out["token"] = token;
    cb(HttpResponse::newHttpJsonResponse(out));
}

void LoginCtrl::logout(const HttpRequestPtr& req,
                       std::function<void(const HttpResponsePtr&)>&& cb)
{
    TokenStore::erase(req->getHeader("X-Vault-Token"));
    Json::Value out;
    out["ok"] = true;
    cb(HttpResponse::newHttpJsonResponse(out));
}

} // namespace vault
