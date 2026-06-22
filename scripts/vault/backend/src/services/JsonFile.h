/**
 * @file JsonFile.h
 * @brief Read/write jsoncpp values from files (0600 on write).
 */
#pragma once

#include <json/json.h>

#include <filesystem>
#include <fstream>
#include <sstream>

namespace vault
{

/// @brief Parse a JSON file. Returns null value if missing or unparseable.
inline Json::Value readJson(const std::filesystem::path& path)
{
    std::ifstream f(path);
    if (!f)
        return Json::Value(Json::nullValue);
    std::stringstream ss;
    ss << f.rdbuf();
    Json::CharReaderBuilder b;
    Json::Value root;
    std::string errs;
    std::istringstream in(ss.str());
    if (!Json::parseFromStream(b, in, &root, &errs))
        return Json::Value(Json::nullValue);
    return root;
}

/// @brief Write @p v as pretty JSON to @p path with 0600 permissions.
inline void writeJson(const std::filesystem::path& path, const Json::Value& v)
{
    if (path.has_parent_path())
        std::filesystem::create_directories(path.parent_path());
    Json::StreamWriterBuilder b;
    b["indentation"] = "  ";
    std::ofstream f(path, std::ios::trunc);
    f << Json::writeString(b, v) << "\n";
    f.close();
    std::error_code ec;
    std::filesystem::permissions(
        path,
        std::filesystem::perms::owner_read | std::filesystem::perms::owner_write,
        std::filesystem::perm_options::replace, ec);
}

} // namespace vault
