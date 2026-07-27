/**
 * @file DatabaseStartup.cpp
 * @brief Prevent a poisoned connection pool during concurrent boot startup.
 */
#include "services/DatabaseStartup.h"
#include "services/DbPool.h"

#include <libpq-fe.h>

#include <chrono>
#include <stdexcept>
#include <thread>

namespace vault
{

void initializeDatabase(const std::string& connectionString)
{
    for (int attempt = 0; attempt < 120; ++attempt) {
        if (PQping(connectionString.c_str()) == PQPING_OK) {
            DbPool::init(connectionString);
            DbPool::get()->execSqlSync("SELECT 1");
            return;
        }
        std::this_thread::sleep_for(std::chrono::seconds(1));
    }
    throw std::runtime_error("database unavailable after 120 seconds");
}

} // namespace vault
