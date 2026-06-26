/**
 * @file DockerExec.cpp
 * @brief docker exec python3/psql helpers with actionable errors.
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

// Turn an opaque non-zero exit into something a human can act on. Exit 127 from
// `docker exec` means the shell found no such program in the target container;
// 126 means it was found but not executable. Otherwise surface the container's
// own stderr so the dialog shows the real reason.
static std::string execError(const std::string& container,
                             const std::string& tool, int exitCode,
                             const std::string& stderrText)
{
    if (exitCode == 127)
        return tool + " is not installed in container '" + container +
               "' — this adapter needs it (or use a different adapter)";
    if (exitCode == 126)
        return tool + " is not executable in container '" + container + "'";
    std::string err = trim(stderrText);
    std::string base = "docker exec " + tool + " in '" + container +
                       "' failed (exit " + std::to_string(exitCode) + ")";
    return err.empty() ? base : base + ": " + err;
}

std::string dockerPython(const std::string& container, const std::string& code)
{
    auto r = runProcess({"docker", "exec", container, "python3", "-c", code});
    if (!r.ok())
        throw std::runtime_error(
            execError(container, "python3", r.exitCode, r.err));
    return trim(r.out);
}

std::string dockerPsql(const std::string& container, const std::string& user,
                       const std::string& db, const std::string& sql)
{
    auto r = runProcess({"docker", "exec", "-i", container, "psql", "-U", user,
                         "-d", db, "-At", "-v", "ON_ERROR_STOP=1"},
                        sql);
    if (!r.ok())
        throw std::runtime_error(
            execError(container, "psql", r.exitCode, r.err));
    return trim(r.out);
}

} // namespace vault::rotator
