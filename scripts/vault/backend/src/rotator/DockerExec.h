/**
 * @file DockerExec.h
 * @brief Helpers to reach into other containers via `docker exec`.
 */
#pragma once

#include <string>

namespace vault::rotator
{

/// @brief Run @p code in @p container via `docker exec <c> python3 -c`.
///        Returns trimmed stdout. Throws std::runtime_error on non-zero exit.
std::string dockerPython(const std::string& container, const std::string& code);

/// @brief Pipe @p sql into `docker exec -i <c> psql -U <user> -d <db> -At`.
///        Returns stdout (empty when not capturing-needed). Throws on failure.
std::string dockerPsql(const std::string& container, const std::string& user,
                       const std::string& db, const std::string& sql);

} // namespace vault::rotator
