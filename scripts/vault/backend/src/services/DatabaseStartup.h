/**
 * @file DatabaseStartup.h
 * @brief Database readiness before constructing Drogon's connection pool.
 */
#pragma once

#include <string>

namespace vault
{

void initializeDatabase(const std::string& connectionString);

} // namespace vault
