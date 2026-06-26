#pragma once
#include <cstddef>
#include <string>

namespace cap {

inline size_t writeCb(char* p, size_t, size_t n, void* ud)
{
    static_cast<std::string*>(ud)->append(p, n);
    return n;
}

} // namespace cap
