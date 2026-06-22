/**
 * @file Bcrypt.h
 * @brief bcrypt password hashing (homegrown, $2b$), OpenBSD-compatible.
 */
#pragma once

#include <string>

namespace vault::crypto
{

/// @brief Hash @p password against a full "$2b$cc$<22-char salt>" setting.
///        Returns the 60-char "$2b$..." crypt string, or "" on bad setting.
std::string bcryptHash(const std::string& password, const std::string& setting);

/// @brief Generate a random "$2b$cc$<salt>" setting (16 random bytes).
std::string bcryptGenSalt(int cost);

/// @brief Convenience: gen salt at @p cost and hash @p password with it.
std::string bcryptHashpw(const std::string& password, int cost);

} // namespace vault::crypto
