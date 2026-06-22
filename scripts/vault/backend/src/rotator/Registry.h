/**
 * @file Registry.h
 * @brief Adapter registry: maps manifest "adapter" names to implementations.
 */
#pragma once

#include "rotator/Adapter.h"

#include <memory>
#include <string>

namespace vault::rotator
{

/// @brief Construct the adapter named @p name (manifest `adapter` field).
/// @throws std::runtime_error if no adapter is registered under that name.
std::unique_ptr<Adapter> makeAdapter(const std::string& name);

} // namespace vault::rotator
