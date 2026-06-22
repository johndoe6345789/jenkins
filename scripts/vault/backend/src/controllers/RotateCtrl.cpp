/**
 * @file RotateCtrl.cpp
 * @brief Single credential rotation endpoint.
 */
#include "controllers/RotateCtrl.h"
#include "controllers/ApiUtil.h"
#include "controllers/CredentialView.h"
#include "crypto/Crypto.h"
#include "rotator/Engine.h"
#include "services/CredentialStore.h"

using namespace drogon;

namespace vault
{

static Json::Value customByName(const std::string& name)
{
    for (const auto& e : readCustom())
        if (e["name"].asString() == name)
            return e;
    return Json::Value(Json::nullValue);
}

void RotateCtrl::rotate(const HttpRequestPtr& req,
                        std::function<void(const HttpResponsePtr&)>&& cb,
                        std::string target)
{
    auto key = req->attributes()->get<crypto::Bytes>("aes_key");
    Json::Value custom = customByName(target);
    if (!custom.isNull()) {
        std::string pw = rotator::Engine::genPassword(32);
        CredentialStore::store(key, target, jget(custom, "badge", "manual"),
                               "/api/rotate/" + target, pw);
        Json::Value out;
        out["ok"] = true;
        out["target"] = target;
        out["password"] = pw;
        cb(HttpResponse::newHttpJsonResponse(out));
        return;
    }

    Json::Value entry = rotator::Engine::findTarget(target);
    if (entry.isNull()) {
        cb(jsonError("unknown target '" + target + "'", k400BadRequest));
        return;
    }
    auto result = rotator::Engine::rotateTarget(entry);
    if (!result.ok) {
        cb(jsonError(result.error, k500InternalServerError));
        return;
    }
    CredentialStore::store(key, target, jget(entry, "badge", jget(entry,
                           "adapter")), "/api/rotate/" + target,
                           result.password);

    Json::Value out;
    out["ok"] = true;
    out["target"] = target;
    out["password"] = result.password;
    cb(HttpResponse::newHttpJsonResponse(out));
}

} // namespace vault
