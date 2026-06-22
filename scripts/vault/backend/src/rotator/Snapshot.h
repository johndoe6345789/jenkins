/**
 * @file Snapshot.h
 * @brief rotated.env (live + archive) and rotated.history.json writers.
 */
#pragma once

#include "services/EnvFile.h"

#include <json/json.h>

#include <string>

namespace vault::rotator
{

struct Stamp
{
    std::string iso;     ///< e.g. 2026-06-21T19:30:00+00:00
    std::string compact; ///< e.g. 20260621T193000Z
};

/// @brief Current UTC timestamp in both forms.
Stamp stampNow();

/// @brief Merge @p values into the live rotated.env and write a per-run archive.
void writeSnapshot(const EnvMap& values, const Stamp& ts);

/// @brief Append @p records (a JSON array) to rotated.history.json.
void appendHistory(const Json::Value& records);

} // namespace vault::rotator
