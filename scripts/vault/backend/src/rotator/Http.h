/**
 * @file Http.h
 * @brief Tiny synchronous HTTP client (libcurl) for REST adapters.
 */
#pragma once

#include <json/json.h>

#include <map>
#include <string>

namespace vault::rotator
{

struct HttpResponse
{
    long status = 0;          ///< HTTP status code (0 on transport error).
    std::string body;
    std::string transportError; ///< Non-empty if the request never completed.

    bool ok() const { return transportError.empty() && status >= 200 &&
                             status < 300; }
};

/// @brief Perform an HTTP request. @p method is GET/POST/PUT. @p headers are
///        sent verbatim. @p basicAuth, when set as "user:pass", adds Basic auth.
HttpResponse httpRequest(const std::string& method, const std::string& url,
                         const std::map<std::string, std::string>& headers = {},
                         const std::string& body = "",
                         const std::string& basicAuth = "",
                         bool insecure = false);

/// @brief Parse @p body as JSON, or return null on failure.
Json::Value parseJson(const std::string& body);

} // namespace vault::rotator
