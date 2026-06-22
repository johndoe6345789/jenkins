/**
 * @file CustomCtrl.cpp
 * @brief User-managed credential CRUD implementation.
 */
#include "controllers/CustomCtrl.h"
#include "controllers/ApiUtil.h"
#include "controllers/CredentialView.h"
#include "crypto/Crypto.h"
#include "services/CredentialStore.h"

using namespace drogon;

namespace vault
{

static std::string field(const Json::Value& v, const char* k)
{
    return v.isMember(k) && v[k].isString() ? v[k].asString() : "";
}

static int findCustom(const Json::Value& entries, const std::string& name)
{
    for (Json::ArrayIndex i = 0; i < entries.size(); ++i)
        if (entries[i]["name"].asString() == name)
            return static_cast<int>(i);
    return -1;
}

void CustomCtrl::create(const HttpRequestPtr& req,
                        std::function<void(const HttpResponsePtr&)>&& cb)
{
    auto body = req->getJsonObject();
    Json::Value in = body ? *body : Json::Value(Json::objectValue);
    std::string service = field(in, "service_name");
    std::string user = field(in, "username");
    if (service.empty() || user.empty()) {
        cb(jsonError("service_name and username are required", k400BadRequest));
        return;
    }

    std::string name = uniqueName(service, user);
    Json::Value entries = readCustom();
    Json::Value e;
    e["name"] = name;
    e["section"] = jget(in, "section", "custom");
    e["service_name"] = service;
    e["username"] = user;
    e["badge"] = jget(in, "badge", "manual");
    e["app_url"] = field(in, "app_url");
    e["repo_path"] = field(in, "repo_path");
    e["group"] = field(in, "group");
    entries.append(e);
    writeCustom(entries);

    std::string pw = field(in, "password");
    if (!pw.empty()) {
        auto key = req->attributes()->get<crypto::Bytes>("aes_key");
        CredentialStore::store(key, name, e["badge"].asString(),
                               "/api/rotate/" + name, pw);
    }
    Json::Value out;
    out["ok"] = true;
    out["name"] = name;
    auto resp = HttpResponse::newHttpJsonResponse(out);
    resp->setStatusCode(k201Created);
    cb(resp);
}

void CustomCtrl::update(const HttpRequestPtr& req,
                        std::function<void(const HttpResponsePtr&)>&& cb,
                        std::string name)
{
    Json::Value entries = readCustom();
    int idx = findCustom(entries, name);
    if (idx < 0) {
        cb(jsonError("not found", k404NotFound));
        return;
    }
    auto body = req->getJsonObject();
    if (body) {
        for (const char* f : {"section", "service_name", "username", "badge",
                              "app_url", "repo_path", "group"})
            if ((*body).isMember(f))
                entries[idx][f] = (*body)[f];
    }
    writeCustom(entries);
    cb(jsonOk());
}

void CustomCtrl::remove(const HttpRequestPtr&,
                        std::function<void(const HttpResponsePtr&)>&& cb,
                        std::string name)
{
    Json::Value entries = readCustom();
    Json::Value out(Json::arrayValue);
    bool found = false;
    for (const auto& e : entries) {
        if (e["name"].asString() == name) {
            found = true;
            continue;
        }
        out.append(e);
    }
    if (!found) {
        cb(jsonError("not found", k404NotFound));
        return;
    }
    writeCustom(out);
    CredentialStore::remove(name);
    cb(jsonOk());
}

void CustomCtrl::password(const HttpRequestPtr& req,
                          std::function<void(const HttpResponsePtr&)>&& cb,
                          std::string name)
{
    Json::Value entries = readCustom();
    int idx = findCustom(entries, name);
    if (idx < 0) {
        cb(jsonError("not found", k404NotFound));
        return;
    }
    auto body = req->getJsonObject();
    std::string pw = body ? field(*body, "password") : "";
    if (pw.empty()) {
        cb(jsonError("password required", k400BadRequest));
        return;
    }
    auto key = req->attributes()->get<crypto::Bytes>("aes_key");
    std::string badge = jget(entries[idx], "badge", "manual");
    CredentialStore::store(key, name, badge, "/api/rotate/" + name, pw);
    cb(jsonOk());
}

} // namespace vault
