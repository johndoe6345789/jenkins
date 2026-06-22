/**
 * @file Subprocess.cpp
 * @brief fork/exec child with piped stdin/stdout/stderr.
 */
#include "services/Subprocess.h"

#include <array>
#include <cstring>
#include <poll.h>
#include <sys/wait.h>
#include <unistd.h>

namespace vault
{

static void drain(int fd, std::string& sink)
{
    char buf[4096];
    ssize_t n;
    while ((n = read(fd, buf, sizeof buf)) > 0)
        sink.append(buf, (size_t)n);
}

ProcResult runProcess(const std::vector<std::string>& argv,
                      const std::string& input)
{
    ProcResult r;
    int inP[2], outP[2], errP[2];
    if (pipe(inP) || pipe(outP) || pipe(errP)) {
        r.err = "pipe() failed";
        return r;
    }

    pid_t pid = fork();
    if (pid < 0) {
        r.err = "fork() failed";
        return r;
    }
    if (pid == 0) {
        dup2(inP[0], STDIN_FILENO);
        dup2(outP[1], STDOUT_FILENO);
        dup2(errP[1], STDERR_FILENO);
        close(inP[0]); close(inP[1]);
        close(outP[0]); close(outP[1]);
        close(errP[0]); close(errP[1]);
        std::vector<char*> args;
        for (auto& a : argv)
            args.push_back(const_cast<char*>(a.c_str()));
        args.push_back(nullptr);
        execvp(args[0], args.data());
        _exit(127);
    }

    close(inP[0]);
    close(outP[1]);
    close(errP[1]);
    if (!input.empty())
        (void)!write(inP[1], input.data(), input.size());
    close(inP[1]);

    drain(outP[0], r.out);
    drain(errP[0], r.err);
    close(outP[0]);
    close(errP[0]);

    int status = 0;
    waitpid(pid, &status, 0);
    r.exitCode = WIFEXITED(status) ? WEXITSTATUS(status) : -1;
    return r;
}

} // namespace vault
