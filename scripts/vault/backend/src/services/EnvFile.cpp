/**
 * @file EnvFile.cpp
 * @brief .env reader/writer.
 */
#include "services/EnvFile.h"

#include <fstream>
#include <sstream>

namespace vault
{

EnvMap readEnv(const std::filesystem::path& path)
{
    EnvMap out;
    std::ifstream f(path);
    if (!f)
        return out;
    std::string line;
    while (std::getline(f, line)) {
        if (line.empty() || line[0] == '#')
            continue;
        auto eq = line.find('=');
        if (eq == std::string::npos)
            continue;
        std::string key = line.substr(0, eq);
        // trim whitespace around the key only
        auto a = key.find_first_not_of(" \t");
        auto b = key.find_last_not_of(" \t");
        if (a == std::string::npos)
            continue;
        out[key.substr(a, b - a + 1)] = line.substr(eq + 1);
    }
    return out;
}

void writeEnv(const std::filesystem::path& path, const EnvMap& values,
              const std::string& header)
{
    if (path.has_parent_path())
        std::filesystem::create_directories(path.parent_path());
    std::ostringstream body;
    body << header;
    for (const auto& [k, v] : values) // std::map iterates sorted
        body << k << '=' << v << '\n';
    std::ofstream f(path, std::ios::trunc);
    f << body.str();
    f.close();
    std::error_code ec;
    std::filesystem::permissions(
        path,
        std::filesystem::perms::owner_read | std::filesystem::perms::owner_write,
        std::filesystem::perm_options::replace, ec);
}

} // namespace vault
