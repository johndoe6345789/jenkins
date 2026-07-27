/**
 * @file HealthCtrl.cpp
 * @brief Health endpoint implementation.
 */
#include "controllers/HealthCtrl.h"
#include "services/DbPool.h"

using namespace drogon;

namespace vault
{

void HealthCtrl::health(
    const HttpRequestPtr&,
    std::function<void(const HttpResponsePtr&)>&& callback)
{
    Json::Value body;
    try {
        DbPool::get()->execSqlSync("SELECT 1");
        body["ok"] = true;
        body["database"] = "ready";
        callback(HttpResponse::newHttpJsonResponse(body));
    } catch (const std::exception& error) {
        body["ok"] = false;
        body["database"] = "unavailable";
        body["error"] = error.what();
        auto response = HttpResponse::newHttpJsonResponse(body);
        response->setStatusCode(k503ServiceUnavailable);
        callback(response);
    }
}

} // namespace vault
