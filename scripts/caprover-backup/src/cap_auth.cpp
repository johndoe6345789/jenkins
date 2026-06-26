#include "cap.h"
#include "cap_write.h"
#include <curl/curl.h>
#include <nlohmann/json.hpp>
#include <stdexcept>

namespace cap {

using json = nlohmann::json;

static std::string post(const std::string& url,
                        const std::string& data) {
    auto* c = curl_easy_init();
    std::string out;
    auto* h = curl_slist_append(nullptr,
                                "Content-Type: application/json");
    curl_easy_setopt(c, CURLOPT_URL,            url.c_str());
    curl_easy_setopt(c, CURLOPT_POSTFIELDS,     data.c_str());
    curl_easy_setopt(c, CURLOPT_HTTPHEADER,     h);
    curl_easy_setopt(c, CURLOPT_SSL_VERIFYPEER, 1L);
    curl_easy_setopt(c, CURLOPT_WRITEFUNCTION,  writeCb);
    curl_easy_setopt(c, CURLOPT_WRITEDATA,      &out);
    curl_easy_perform(c);
    curl_slist_free_all(h);
    curl_easy_cleanup(c);
    return out;
}

std::string login(const std::string& url,
                  const std::string& pw) {
    json body = {{"password", pw}};
    auto resp = json::parse(
        post(url + "/api/v2/login", body.dump()));
    if (resp.value("status", -1) != 100)
        throw std::runtime_error(
            resp.value("description", resp.dump()));
    auto tok = resp["data"]["token"].get<std::string>();
    if (tok.empty())
        throw std::runtime_error("login: empty token");
    return tok;
}

} // namespace cap
