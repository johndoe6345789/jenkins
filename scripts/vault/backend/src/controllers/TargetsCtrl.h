/**
 * @file TargetsCtrl.h
 * @brief GET /api/targets — all credentials grouped by section.
 */
#pragma once

#include <drogon/HttpController.h>

namespace vault
{

class TargetsCtrl : public drogon::HttpController<TargetsCtrl>
{
  public:
    METHOD_LIST_BEGIN
    ADD_METHOD_TO(TargetsCtrl::targets, "/api/targets", drogon::Get,
                  "vault::VaultAuthFilter");
    METHOD_LIST_END

    void targets(const drogon::HttpRequestPtr& req,
                 std::function<void(const drogon::HttpResponsePtr&)>&& cb);
};

} // namespace vault
