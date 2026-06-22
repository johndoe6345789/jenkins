/**
 * @file LoginCtrl.h
 * @brief Session login/logout endpoints.
 */
#pragma once

#include <drogon/HttpController.h>

namespace vault
{

class LoginCtrl : public drogon::HttpController<LoginCtrl>
{
  public:
    METHOD_LIST_BEGIN
    ADD_METHOD_TO(LoginCtrl::login, "/api/login", drogon::Post);
    ADD_METHOD_TO(LoginCtrl::logout, "/api/logout", drogon::Post,
                  "vault::VaultAuthFilter");
    METHOD_LIST_END

    void login(const drogon::HttpRequestPtr& req,
               std::function<void(const drogon::HttpResponsePtr&)>&& cb);
    void logout(const drogon::HttpRequestPtr& req,
                std::function<void(const drogon::HttpResponsePtr&)>&& cb);
};

} // namespace vault
