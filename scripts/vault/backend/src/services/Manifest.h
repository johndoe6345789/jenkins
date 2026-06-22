/**
 * @file Manifest.h
 * @brief Access to manifest.json targets and the custom.json credential list.
 */
#pragma once

#include "services/JsonFile.h"
#include "services/Paths.h"

#include <json/json.h>

namespace vault
{

/// @brief Manifest-driven rotation targets (array; empty if absent).
inline Json::Value manifestTargets()
{
    Json::Value root = readJson(Paths::manifest());
    if (root.isObject() && root.isMember("targets"))
        return root["targets"];
    return Json::Value(Json::arrayValue);
}

/// @brief User-managed custom credential entries (array; empty if absent).
inline Json::Value readCustom()
{
    Json::Value v = readJson(Paths::customJson());
    return v.isArray() ? v : Json::Value(Json::arrayValue);
}

/// @brief Persist the custom credential list (0600).
inline void writeCustom(const Json::Value& entries)
{
    writeJson(Paths::customJson(), entries);
}

} // namespace vault
