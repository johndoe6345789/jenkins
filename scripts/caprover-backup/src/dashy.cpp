#include "dashy.h"
#include "cap_write.h"
#include <curl/curl.h>
#include <fstream>
#include <iostream>
#include <iterator>
#include <nlohmann/json.hpp>
#include <stdexcept>

namespace dashy {

using json = nlohmann::json;

// GET (no data) or POST (with data). key="-" or empty = no auth.
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

// Backup: GET /conf.yml and write YAML to file as-is.
void backup(const std::string& url, const std::string& key,
            const std::string& path) {
    auto yaml = call(url + "/conf.yml", key);
    if (yaml.empty())
        throw std::runtime_error("/conf.yml returned empty");
    std::ofstream f(path);
    if (!f) throw std::runtime_error("cannot open: " + path);
    f << yaml;
}

// Restore: POST /config-manager/save with {"config":"<yaml>"}
void restore(const std::string& url, const std::string& key,
             const std::string& path) {
    std::ifstream f(path);
    if (!f) throw std::runtime_error("cannot open: " + path);
    std::string yaml(std::istreambuf_iterator<char>(f), {});
    json body = {{"config", yaml}};
    auto raw = call(url + "/config-manager/save", key, body.dump());
    json r   = json::parse(raw);
    if (!r.value("success", false))
        throw std::runtime_error(r.value("message", raw));
    std::cout << "Config restored to " << url << "\n";
}

} // namespace dashy
