/**
 * @file EnvFile.h
 * @brief Read/write KEY=value .env files (0600), matching the prior tooling.
 */
#pragma once

#include <filesystem>
#include <map>
#include <string>

namespace vault
{

using EnvMap = std::map<std::string, std::string>;

/// @brief Parse an .env file. Blank lines, '#' comments and lines without '='
///        are skipped. Values are kept verbatim (not trimmed).
EnvMap readEnv(const std::filesystem::path& path);

/// @brief Write @p values sorted as KEY=value, prefixed by @p header, 0600.
void writeEnv(const std::filesystem::path& path, const EnvMap& values,
              const std::string& header = "");

} // namespace vault
