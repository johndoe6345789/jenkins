/**
 * @file HistoryCtrl.h
 * @brief Recent stored credential history endpoint.
 */
#pragma once

#include <drogon/HttpController.h>

namespace vault
{

class HistoryCtrl : public drogon::HttpController<HistoryCtrl>
{
  public:
    METHOD_LIST_BEGIN
    ADD_METHOD_TO(HistoryCtrl::history, "/api/history", drogon::Get,
                  "vault::VaultAuthFilter");
    METHOD_LIST_END

    void history(const drogon::HttpRequestPtr& req,
                 std::function<void(const drogon::HttpResponsePtr&)>&& cb);
};

} // namespace vault
