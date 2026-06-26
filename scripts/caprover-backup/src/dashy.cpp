#include "dashy.h"
#include "cap_write.h"
#include <curl/curl.h>
#include <fstream>
#include <iostream>
#include <nlohmann/json.hpp>
#include <stdexcept>

namespace dashy {

using json = nlohmann::json;

// GET (no data) or POST (with data). key="" or "-" = no auth.
static std::string call(const std::string& url,
                        const std::string& key,
                        const std::string& data = {}) {
    auto* c = curl_easy_init();
    std::string out;
    curl_slist* h = nullptr;
    if (!key.empty() && key != "-")
        h = curl_slist_append(h,
            ("Authorization: Bearer " + key).c_str());
    if (!data.empty())
        h = curl_slist_append(h, "Content-Type: application/json");
    curl_easy_setopt(c, CURLOPT_URL,            url.c_str());
    if (!data.empty())
        curl_easy_setopt(c, CURLOPT_POSTFIELDS, data.c_str());
    curl_easy_setopt(c, CURLOPT_HTTPHEADER,     h);
    curl_easy_setopt(c, CURLOPT_SSL_VERIFYPEER, 1L);
    curl_easy_setopt(c, CURLOPT_WRITEFUNCTION,  cap::writeCb);
    curl_easy_setopt(c, CURLOPT_WRITEDATA,      &out);
    curl_easy_perform(c);
    curl_slist_free_all(h);
    curl_easy_cleanup(c);
    return out;
}

void backup(const std::string& url, const std::string& key,
            const std::string& path) {
    auto raw = call(url + "/api/config", key);
    json r   = json::parse(raw);
    // Dashy may wrap the config in {"config":{...}}; unwrap it.
    json cfg = r.contains("config") ? r["config"] : r;
    std::ofstream f(path);
    if (!f) throw std::runtime_error("cannot open: " + path);
    f << cfg.dump(2) << "\n";
}

void restore(const std::string& url, const std::string& key,
             const std::string& path) {
    std::ifstream f(path);
    if (!f) throw std::runtime_error("cannot open: " + path);
    json cfg = json::parse(f);
    // POST the raw config; Dashy also accepts {"config":{...}}
    // but the direct form is more widely compatible.
    auto raw = call(url + "/api/config", key, cfg.dump());
    json r   = json::parse(raw);
    if (r.contains("error"))
        throw std::runtime_error(r["error"].get<std::string>());
    std::cout << "Config restored to " << url << "\n";
}

} // namespace dashy
