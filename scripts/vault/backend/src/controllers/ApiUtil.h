/**
 * @file ApiUtil.h
 * @brief Small JSON response helpers shared by controllers.
 */
#pragma once

#include <drogon/HttpResponse.h>

namespace vault
{

inline drogon::HttpResponsePtr jsonError(const std::string& msg,
                                         drogon::HttpStatusCode code)
{
    Json::Value err;
    err["error"] = msg;
    auto r = drogon::HttpResponse::newHttpJsonResponse(err);
    r->setStatusCode(code);
    return r;
}

inline drogon::HttpResponsePtr jsonOk()
{
    Json::Value out;
    out["ok"] = true;
    return drogon::HttpResponse::newHttpJsonResponse(out);
}

} // namespace vault
