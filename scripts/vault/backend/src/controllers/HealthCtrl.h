/**
 * @file HealthCtrl.h
 * @brief Unauthenticated liveness and database-readiness endpoint.
 */
#pragma once

#include <drogon/HttpController.h>

namespace vault
{

class HealthCtrl : public drogon::HttpController<HealthCtrl>
{
  public:
    METHOD_LIST_BEGIN
    ADD_METHOD_TO(HealthCtrl::health, "/api/health", drogon::Get);
    METHOD_LIST_END

    void health(
        const drogon::HttpRequestPtr& req,
        std::function<void(const drogon::HttpResponsePtr&)>&& callback);
};

} // namespace vault
