/**
 * @file BcryptBase64.h
 * @brief bcrypt's custom base64 ("./A-Za-z0-9"), no padding.
 */
#pragma once

#include <cstdint>
#include <string>
#include <vector>

namespace vault::crypto
{

inline const char* bcryptB64Code()
{
    return "./ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
}

/// @brief Encode @p len bytes using bcrypt's alphabet (OpenBSD layout).
inline std::string bcryptB64Encode(const uint8_t* data, int len)
{
    const char* code = bcryptB64Code();
    std::string out;
    int i = 0;
    while (i < len) {
        uint32_t c1 = data[i++];
        out += code[c1 >> 2];
        c1 = (c1 & 0x03) << 4;
        if (i >= len) { out += code[c1]; break; }
        uint32_t c2 = data[i++];
        c1 |= (c2 >> 4) & 0x0f;
        out += code[c1];
        c1 = (c2 & 0x0f) << 2;
        if (i >= len) { out += code[c1]; break; }
        c2 = data[i++];
        c1 |= (c2 >> 6) & 0x03;
        out += code[c1];
        out += code[c2 & 0x3f];
    }
    return out;
}

inline int bcryptB64Index(char c)
{
    const char* code = bcryptB64Code();
    for (int i = 0; i < 64; ++i)
        if (code[i] == c)
            return i;
    return -1;
}

/// @brief Decode exactly @p nbytes bytes worth of bcrypt base64.
inline std::vector<uint8_t> bcryptB64Decode(const std::string& s, int nbytes)
{
    std::vector<uint8_t> out;
    size_t pos = 0;
    while ((int)out.size() < nbytes && pos < s.size()) {
        int c1 = bcryptB64Index(s[pos++]);
        int c2 = pos < s.size() ? bcryptB64Index(s[pos++]) : 0;
        out.push_back((uint8_t)((c1 << 2) | ((c2 & 0x30) >> 4)));
        if ((int)out.size() >= nbytes || pos >= s.size()) break;
        int c3 = bcryptB64Index(s[pos++]);
        out.push_back((uint8_t)(((c2 & 0x0f) << 4) | ((c3 & 0x3c) >> 2)));
        if ((int)out.size() >= nbytes || pos >= s.size()) break;
        int c4 = bcryptB64Index(s[pos++]);
        out.push_back((uint8_t)(((c3 & 0x03) << 6) | c4));
    }
    return out;
}

} // namespace vault::crypto
