/**
 * @file Adapter.h
 * @brief Rotation adapter interface. Each backend (env file, DB, REST API)
 *        implements rotate()/status() over a manifest params block.
 */
#pragma once

#include <json/json.h>

#include <string>

namespace vault::rotator
{

/// @brief One credential backend. rotate() applies a new password; status()
///        returns read-only metadata (never secrets). Both throw
///        std::runtime_error on backend failure.
class Adapter
{
  public:
    virtual ~Adapter() = default;
    virtual void rotate(const Json::Value& params,
                        const std::string& newPassword) = 0;
    virtual Json::Value status(const Json::Value& params) = 0;
};

} // namespace vault::rotator
