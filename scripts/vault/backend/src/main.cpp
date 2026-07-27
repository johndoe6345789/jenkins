/**
 * @file main.cpp
 * @brief Drogon entrypoint for the vault backend.
 */
#include "services/DatabaseStartup.h"
#include "services/DbPool.h"
#include "services/Paths.h"
#include "services/VaultConfig.h"

#include <drogon/drogon.h>

#include <cstdlib>
#include <algorithm>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <sstream>
#include <vector>

namespace
{

std::string envOr(const char* name, const std::string& fallback)
{
    if (const char* v = std::getenv(name); v && *v)
        return v;
    return fallback;
}

std::string readFile(const std::filesystem::path& path)
{
    std::ifstream in(path);
    if (!in)
        throw std::runtime_error("failed to read " + path.string());
    std::ostringstream ss;
    ss << in.rdbuf();
    return ss.str();
}

void applyMigrations()
{
    std::vector<std::filesystem::path> files;
    for (const auto& e : std::filesystem::directory_iterator(
             vault::Paths::migrations())) {
        if (e.is_regular_file() && e.path().extension() == ".sql")
            files.push_back(e.path());
    }
    std::sort(files.begin(), files.end());
    for (const auto& path : files)
        vault::DbPool::get()->execSqlSync(readFile(path));
}

} // namespace

int main()
{
    try {
        std::string db = envOr("VAULT_DATABASE_URL",
                               "host=vault-db port=5432 dbname=vault "
                               "user=vault password=vault");
        vault::initializeDatabase(db);
        applyMigrations();
        vault::VaultConfig::bootstrap();

        drogon::app().addListener("0.0.0.0", 5050);
        drogon::app().setThreadNum(2);
        drogon::app().run();
    } catch (const std::exception& e) {
        std::cerr << "vault-server: " << e.what() << '\n';
        return 1;
    }
    return 0;
}
