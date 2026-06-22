/**
 * @file Engine.h
 * @brief Manifest-driven rotation engine (the rotate.py port). Drives adapters,
 *        writes rotated.env (live + archive) and rotated.history.json.
 */
#pragma once

#include <json/json.h>

#include <string>
#include <vector>

namespace vault::rotator
{

/// @brief Per-target outcome from a single rotation.
struct RotateOutcome
{
    bool ok = false;
    std::string password;     ///< the new password (empty on failure)
    std::string secretEnvKey; ///< manifest secret_env_key
    std::string error;
};

class Engine
{
  public:
    /// @brief Generate an alphanumeric password of length @p n.
    static std::string genPassword(int n = 32);

    /// @brief Read status metadata for each target in @p only (all if empty).
    static Json::Value statusAll(const std::vector<std::string>& only);

    /// @brief Rotate one manifest target, applying the adapter then recording
    ///        the new secret to rotated.env + history. @p password empty ⇒
    ///        generate. Used both by the CLI and the API rotate endpoint.
    static RotateOutcome rotateTarget(const Json::Value& target,
                                      const std::string& password = "");

    /// @brief Rotate every target in @p only (all if empty); returns the count
    ///        of failures. @p out collects per-target [ok] / [fail] lines.
    static int rotateAll(const std::vector<std::string>& only,
                         const std::string& password, bool dryRun,
                         bool stopOnError, std::vector<std::string>& log);

    /// @brief Look a target up in the manifest by name (null if absent).
    static Json::Value findTarget(const std::string& name);

    /// @brief Manifest targets whose name is in @p only (all if empty).
    static std::vector<Json::Value>
    selectTargets(const std::vector<std::string>& only);
};

} // namespace vault::rotator
