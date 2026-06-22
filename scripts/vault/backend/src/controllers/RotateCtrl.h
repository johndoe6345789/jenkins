/**
 * @file RotateCtrl.h
 * @brief POST /api/rotate/{target} — rotate one credential.
 */
#pragma once

#include <drogon/HttpController.h>

namespace vault
{

class RotateCtrl : public drogon::HttpController<RotateCtrl>
{
  public:
    METHOD_LIST_BEGIN
    ADD_METHOD_TO(RotateCtrl::rotate, "/api/rotate/{1}", drogon::Post,
                  "vault::VaultAuthFilter");
    METHOD_LIST_END

    void rotate(const drogon::HttpRequestPtr& req,
                std::function<void(const drogon::HttpResponsePtr&)>&& cb,
                std::string target);
};

} // namespace vault
