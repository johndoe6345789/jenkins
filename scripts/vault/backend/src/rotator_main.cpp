/**
 * @file rotator_main.cpp
 * @brief `vault-rotate` CLI — drop-in for the old rotate.py (status/rotate/
 *        generate, --only/--password/--dry-run/--stop-on-error).
 */
#include "rotator/AdapterUtil.h"
#include "rotator/Engine.h"
#include "services/Manifest.h"

#include <curl/curl.h>

#include <cstdio>
#include <cstring>
#include <set>
#include <string>
#include <vector>

using namespace vault;
using namespace vault::rotator;

namespace
{
struct Args
{
    std::string cmd;
    std::vector<std::string> only;
    std::string password;
    bool dryRun = false;
    bool stopOnError = false;
};

int usage()
{
    fprintf(stderr, "usage: vault-rotate {status|rotate|generate} "
                    "[--only NAME...] [--password P] [--dry-run] "
                    "[--stop-on-error]\n");
    return 2;
}

// Reject names not present in the manifest, mirroring rotate.py's select().
bool validateOnly(const std::vector<std::string>& only)
{
    std::set<std::string> names;
    for (const auto& t : manifestTargets())
        names.insert(t["name"].asString());
    std::string missing;
    for (const auto& n : only)
        if (!names.count(n))
            missing += (missing.empty() ? "" : ", ") + n;
    if (!missing.empty()) {
        fprintf(stderr, "unknown target(s): %s\n", missing.c_str());
        return false;
    }
    return true;
}
} // namespace

static int cmdStatus(const Args& a)
{
    for (const auto& row : Engine::statusAll(a.only)) {
        std::string meta = row.isMember("error")
                               ? "ERROR: " + row["error"].asString()
                               : jsonCompact(row["status"]);
        printf("%-40s %-18s %s\n", row["name"].asCString(),
               row["adapter"].asCString(), meta.c_str());
    }
    return 0;
}

static int cmdRotate(const Args& a)
{
    if (!a.password.empty() && a.only.size() != 1) {
        fprintf(stderr, "--password requires --only <one target>\n");
        return 2;
    }
    std::vector<std::string> log;
    int failures =
        Engine::rotateAll(a.only, a.password, a.dryRun, a.stopOnError, log);
    for (const auto& line : log)
        printf("%s\n", line.c_str());
    return failures ? 1 : 0;
}

static int cmdGenerate(const Args& a)
{
    for (const auto& t : Engine::selectTargets(a.only))
        printf("%s=%s\n", t["secret_env_key"].asCString(),
               Engine::genPassword().c_str());
    return 0;
}

int main(int argc, char** argv)
{
    curl_global_init(CURL_GLOBAL_DEFAULT);
    if (argc < 2)
        return usage();

    Args a;
    a.cmd = argv[1];
    for (int i = 2; i < argc; ++i) {
        std::string arg = argv[i];
        if (arg == "--only")
            while (i + 1 < argc && argv[i + 1][0] != '-')
                a.only.push_back(argv[++i]);
        else if (arg == "--password" && i + 1 < argc)
            a.password = argv[++i];
        else if (arg == "--dry-run")
            a.dryRun = true;
        else if (arg == "--stop-on-error")
            a.stopOnError = true;
        else
            return usage();
    }

    if (!validateOnly(a.only))
        return 2;
    if (a.cmd == "status")
        return cmdStatus(a);
    if (a.cmd == "rotate")
        return cmdRotate(a);
    if (a.cmd == "generate")
        return cmdGenerate(a);
    return usage();
}
