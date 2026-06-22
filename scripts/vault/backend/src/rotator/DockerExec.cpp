/**
 * @file DockerExec.cpp
 * @brief docker exec python3/psql helpers.
 */
#include "rotator/DockerExec.h"
#include "services/Subprocess.h"

#include <stdexcept>

namespace vault::rotator
{

static std::string trim(const std::string& s)
{
    auto a = s.find_first_not_of(" \t\r\n");
    if (a == std::string::npos)
        return "";
    auto b = s.find_last_not_of(" \t\r\n");
    return s.substr(a, b - a + 1);
}

std::string dockerPython(const std::string& container, const std::string& code)
{
    auto r = runProcess({"docker", "exec", container, "python3", "-c", code});
    if (!r.ok()) {
        std::string err = trim(r.err);
        throw std::runtime_error(err.empty()
                                     ? "docker exec exit " + std::to_string(r.exitCode)
                                     : err);
    }
    return trim(r.out);
}

std::string dockerPsql(const std::string& container, const std::string& user,
                       const std::string& db, const std::string& sql)
{
    auto r = runProcess({"docker", "exec", "-i", container, "psql", "-U", user,
                         "-d", db, "-At", "-v", "ON_ERROR_STOP=1"},
                        sql);
    if (!r.ok()) {
        std::string err = trim(r.err);
        throw std::runtime_error(err.empty()
                                     ? "psql exit " + std::to_string(r.exitCode)
                                     : err);
    }
    return trim(r.out);
}

} // namespace vault::rotator
