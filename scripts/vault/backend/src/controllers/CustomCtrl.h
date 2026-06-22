/**
 * @file CustomCtrl.h
 * @brief CRUD endpoints for user-managed vault credentials.
 */
#pragma once

#include <drogon/HttpController.h>

namespace vault
{

class CustomCtrl : public drogon::HttpController<CustomCtrl>
{
  public:
    METHOD_LIST_BEGIN
    ADD_METHOD_TO(CustomCtrl::create, "/api/custom", drogon::Post,
                  "vault::VaultAuthFilter");
    ADD_METHOD_TO(CustomCtrl::update, "/api/custom/{1}", drogon::Patch,
                  "vault::VaultAuthFilter");
    ADD_METHOD_TO(CustomCtrl::remove, "/api/custom/{1}", drogon::Delete,
                  "vault::VaultAuthFilter");
    ADD_METHOD_TO(CustomCtrl::password, "/api/custom/{1}/password",
                  drogon::Put, "vault::VaultAuthFilter");
    METHOD_LIST_END

    void create(const drogon::HttpRequestPtr& req,
                std::function<void(const drogon::HttpResponsePtr&)>&& cb);
    void update(const drogon::HttpRequestPtr& req,
                std::function<void(const drogon::HttpResponsePtr&)>&& cb,
                std::string name);
    void remove(const drogon::HttpRequestPtr& req,
                std::function<void(const drogon::HttpResponsePtr&)>&& cb,
                std::string name);
    void password(const drogon::HttpRequestPtr& req,
                  std::function<void(const drogon::HttpResponsePtr&)>&& cb,
                  std::string name);
};

} // namespace vault
