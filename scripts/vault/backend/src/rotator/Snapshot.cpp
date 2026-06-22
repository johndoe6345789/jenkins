/**
 * @file Snapshot.cpp
 * @brief Snapshot/history persistence.
 */
#include "rotator/Snapshot.h"
#include "services/JsonFile.h"
#include "services/Paths.h"

#include <chrono>
#include <ctime>

namespace vault::rotator
{

Stamp stampNow()
{
    auto t = std::chrono::system_clock::to_time_t(
        std::chrono::system_clock::now());
    std::tm tm = *std::gmtime(&t);
    char iso[32], comp[20];
    std::strftime(iso, sizeof iso, "%Y-%m-%dT%H:%M:%S+00:00", &tm);
    std::strftime(comp, sizeof comp, "%Y%m%dT%H%M%SZ", &tm);
    return {iso, comp};
}

void writeSnapshot(const EnvMap& values, const Stamp& ts)
{
    auto live = readEnv(Paths::rotatedEnv());
    for (const auto& [k, v] : values)
        live[k] = v;
    writeEnv(Paths::rotatedEnv(), live,
             "# rotated.env — live view, updated " + ts.iso + "\n");

    auto archive = Paths::rotatedDir() / (ts.compact + ".env");
    writeEnv(archive, values, "# rotated at " + ts.iso + "\n");
}

void appendHistory(const Json::Value& records)
{
    Json::Value prior = readJson(Paths::history());
    if (!prior.isArray())
        prior = Json::Value(Json::arrayValue);
    for (const auto& r : records)
        prior.append(r);
    writeJson(Paths::history(), prior);
}

} // namespace vault::rotator
