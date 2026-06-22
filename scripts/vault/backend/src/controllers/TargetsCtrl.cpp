/**
 * @file TargetsCtrl.cpp
 * @brief /api/targets implementation.
 */
#include "controllers/TargetsCtrl.h"
#include "controllers/CredentialView.h"
#include "crypto/Crypto.h"

using namespace drogon;

namespace vault
{

void TargetsCtrl::targets(const HttpRequestPtr& req,
                          std::function<void(const HttpResponsePtr&)>&& cb)
{
    auto key = req->attributes()->get<crypto::Bytes>("aes_key");
    Json::Value sections(Json::objectValue);

    for (const auto& t : manifestTargets()) {
        std::string sec = jget(t, "section", "frontends");
        sections[sec].append(credentialFromTarget(key, t));
    }
    for (const auto& e : readCustom()) {
        std::string sec = jget(e, "section", "custom");
        sections[sec].append(credentialFromCustom(key, e));
    }
    cb(HttpResponse::newHttpJsonResponse(sections));
}

} // namespace vault
