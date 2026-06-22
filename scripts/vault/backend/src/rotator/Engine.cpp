/**
 * @file Engine.cpp
 * @brief Rotation engine: selection, status, password generation.
 */
#include "rotator/Engine.h"
#include "rotator/Registry.h"
#include "services/Manifest.h"

#include <openssl/rand.h>

namespace vault::rotator
{

std::string Engine::genPassword(int n)
{
    static const char* alphabet =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    std::string out;
    out.reserve(n);
    while ((int)out.size() < n) {
        uint8_t b;
        RAND_bytes(&b, 1);
        if (b < 248) // reject the top 8 values to avoid modulo bias (62*4)
            out += alphabet[b % 62];
    }
    return out;
}

Json::Value Engine::findTarget(const std::string& name)
{
    for (const auto& t : manifestTargets())
        if (t["name"].asString() == name)
            return t;
    return Json::Value(Json::nullValue);
}

std::vector<Json::Value>
Engine::selectTargets(const std::vector<std::string>& only)
{
    std::vector<Json::Value> out;
    for (const auto& t : manifestTargets()) {
        if (only.empty()) {
            out.push_back(t);
            continue;
        }
        for (const auto& name : only)
            if (t["name"].asString() == name) {
                out.push_back(t);
                break;
            }
    }
    return out;
}

Json::Value Engine::statusAll(const std::vector<std::string>& only)
{
    Json::Value rows(Json::arrayValue);
    for (const auto& t : selectTargets(only)) {
        Json::Value row;
        row["name"] = t["name"];
        row["adapter"] = t["adapter"];
        try {
            row["status"] = makeAdapter(t["adapter"].asString())
                                ->status(t["params"]);
        } catch (const std::exception& e) {
            row["error"] = e.what();
        }
        rows.append(row);
    }
    return rows;
}

} // namespace vault::rotator
