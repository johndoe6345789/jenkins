/**
 * @file Paths.h
 * @brief Resolved on-disk locations, mirroring the prior Flask layout.
 */
#pragma once

#include <cstdlib>
#include <filesystem>
#include <string>

namespace vault
{

/// @brief Repo-root-relative paths the vault + rotator read and write.
struct Paths
{
    static std::filesystem::path repoRoot()
    {
        if (const char* r = std::getenv("VAULT_REPO_ROOT"))
            return r;
        return "/app";
    }

    static std::filesystem::path scripts() { return repoRoot() / "scripts"; }
    static std::filesystem::path secrets() { return repoRoot() / "secrets"; }

    static std::filesystem::path manifest()
    {
        return scripts() / "rotator" / "manifest.json";
    }
    static std::filesystem::path migrations()
    {
        return scripts() / "vault" / "backend" / "migrations";
    }
    static std::filesystem::path customJson() { return secrets() / "custom.json"; }
    static std::filesystem::path rotatedEnv() { return secrets() / "rotated.env"; }
    static std::filesystem::path vaultEnv() { return secrets() / "vault.env"; }
    static std::filesystem::path rotatedDir() { return secrets() / "rotated"; }
    static std::filesystem::path history()
    {
        return secrets() / "rotated.history.json";
    }
};

} // namespace vault
