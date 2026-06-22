/**
 * @file Http.cpp
 * @brief libcurl-backed HTTP client.
 */
#include "rotator/Http.h"

#include <curl/curl.h>

#include <sstream>

namespace vault::rotator
{

static size_t writeCb(char* ptr, size_t size, size_t nmemb, void* userdata)
{
    auto* s = static_cast<std::string*>(userdata);
    s->append(ptr, size * nmemb);
    return size * nmemb;
}

HttpResponse httpRequest(const std::string& method, const std::string& url,
                         const std::map<std::string, std::string>& headers,
                         const std::string& body, const std::string& basicAuth,
                         bool insecure)
{
    HttpResponse r;
    CURL* curl = curl_easy_init();
    if (!curl) {
        r.transportError = "curl init failed";
        return r;
    }

    curl_slist* hdrs = nullptr;
    for (const auto& [k, v] : headers)
        hdrs = curl_slist_append(hdrs, (k + ": " + v).c_str());

    curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
    curl_easy_setopt(curl, CURLOPT_CUSTOMREQUEST, method.c_str());
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, hdrs);
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, writeCb);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &r.body);
    curl_easy_setopt(curl, CURLOPT_TIMEOUT, 15L);
    curl_easy_setopt(curl, CURLOPT_FOLLOWLOCATION, 1L);
    if (!body.empty()) {
        curl_easy_setopt(curl, CURLOPT_POSTFIELDS, body.c_str());
        curl_easy_setopt(curl, CURLOPT_POSTFIELDSIZE, (long)body.size());
    }
    if (!basicAuth.empty()) {
        curl_easy_setopt(curl, CURLOPT_HTTPAUTH, (long)CURLAUTH_BASIC);
        curl_easy_setopt(curl, CURLOPT_USERPWD, basicAuth.c_str());
    }
    if (insecure) {
        curl_easy_setopt(curl, CURLOPT_SSL_VERIFYPEER, 0L);
        curl_easy_setopt(curl, CURLOPT_SSL_VERIFYHOST, 0L);
    }

    CURLcode rc = curl_easy_perform(curl);
    if (rc != CURLE_OK)
        r.transportError = curl_easy_strerror(rc);
    else
        curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &r.status);

    curl_slist_free_all(hdrs);
    curl_easy_cleanup(curl);
    return r;
}

Json::Value parseJson(const std::string& body)
{
    Json::CharReaderBuilder b;
    Json::Value v;
    std::string errs;
    std::istringstream in(body);
    if (!Json::parseFromStream(b, in, &v, &errs))
        return Json::Value(Json::nullValue);
    return v;
}

} // namespace vault::rotator
