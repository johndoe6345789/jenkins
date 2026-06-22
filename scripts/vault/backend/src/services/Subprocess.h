/**
 * @file Subprocess.h
 * @brief Run a child process (docker exec / psql) with optional stdin,
 *        capturing stdout, stderr and exit status.
 */
#pragma once

#include <string>
#include <vector>

namespace vault
{

struct ProcResult
{
    int exitCode = -1;
    std::string out;
    std::string err;
    bool ok() const { return exitCode == 0; }
};

/// @brief Execute @p argv (no shell). @p input is fed to the child's stdin.
ProcResult runProcess(const std::vector<std::string>& argv,
                      const std::string& input = "");

} // namespace vault
