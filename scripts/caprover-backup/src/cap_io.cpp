#include "cap.h"
#include "cap_write.h"
#include <curl/curl.h>
#include <fstream>
#include <iostream>
#include <nlohmann/json.hpp>
#include <stdexcept>

namespace cap {

using json = nlohmann::json;

// GET (empty data) or POST (non-empty data) with captain auth.
static std::string req(const std::string& url,
                       const std::string& tok,
                       const std::string& data = {}) {
    auto* c = curl_easy_init();
    std::string out;
    auto* h = curl_slist_append(nullptr,
        ("x-captain-auth: " + tok).c_str());
    if (!data.empty())
        h = curl_slist_append(h, "Content-Type: application/json");
    curl_easy_setopt(c, CURLOPT_URL,            url.c_str());
    if (!data.empty())
        curl_easy_setopt(c, CURLOPT_POSTFIELDS, data.c_str());
    curl_easy_setopt(c, CURLOPT_HTTPHEADER,     h);
    curl_easy_setopt(c, CURLOPT_SSL_VERIFYPEER, 1L);
    curl_easy_setopt(c, CURLOPT_WRITEFUNCTION,  writeCb);
    curl_easy_setopt(c, CURLOPT_WRITEDATA,      &out);
    curl_easy_perform(c);
    curl_slist_free_all(h);
    curl_easy_cleanup(c);
    return out;
}

void backup(const std::string& url, const std::string& tok,
            const std::string& path) {
    auto r = json::parse(
        req(url + "/api/v2/user/apps/appDefinitions/", tok));
    if (r.value("status", -1) != 100)
        throw std::runtime_error(
            r.value("description", r.dump()));
    json out = {
        {"version",     1},
        {"source_url",  url},
        {"root_domain", r["data"].value("rootDomain", "")},
        {"apps",        r["data"]["appDefinitions"]},
    };
    std::ofstream f(path);
    if (!f) throw std::runtime_error("cannot open: " + path);
    f << out.dump(2) << "\n";
}

void restore(const std::string& url, const std::string& tok,
             const std::string& path) {
    std::ifstream f(path);
    if (!f) throw std::runtime_error("cannot open: " + path);
    json bk = json::parse(f);
    int ok = 0, skip = 0;
    std::string base = url + "/api/v2/user/apps";
    for (auto& app : bk["apps"]) {
        std::string name = app["appName"];
        json reg = {{"appName",         name},
                    {"hasPersistentData",
                     app.value("hasPersistentData", false)}};
        req(base + "/register", tok, reg.dump());
        auto r = json::parse(
            req(base + "/update", tok, app.dump()));
        if (r.value("status", -1) == 100) { ++ok; continue; }
        ++skip;
        std::cerr << "  skip " << name << ": "
                  << r.value("description", "?") << "\n";
    }
    std::cout << ok << " restored, " << skip << " skipped\n";
}

} // namespace cap
