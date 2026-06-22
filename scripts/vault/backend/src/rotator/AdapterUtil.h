/**
 * @file AdapterUtil.h
 * @brief Small quoting/param helpers shared by rotation adapters.
 */
#pragma once

#include <json/json.h>

#include <stdexcept>
#include <string>

namespace vault::rotator
{

/// @brief Fetch a string param, or @p def if absent.
inline std::string param(const Json::Value& p, const char* key,
                         const std::string& def = "")
{
    return p.isMember(key) && p[key].isString() ? p[key].asString() : def;
}

/// @brief Fetch a required string param or throw.
inline std::string requireParam(const Json::Value& p, const char* key)
{
    if (!p.isMember(key) || !p[key].isString())
        throw std::runtime_error(std::string("missing param: ") + key);
    return p[key].asString();
}

/// @brief Serialize @p v to a compact single-line JSON string.
inline std::string jsonCompact(const Json::Value& v)
{
    Json::StreamWriterBuilder b;
    b["indentation"] = "";
    return Json::writeString(b, v);
}

/// @brief Render @p s as a single-quoted Python string literal.
inline std::string pyRepr(const std::string& s)
{
    std::string out = "'";
    for (char c : s) {
        switch (c) {
        case '\\': out += "\\\\"; break;
        case '\'': out += "\\'"; break;
        case '\n': out += "\\n"; break;
        case '\r': out += "\\r"; break;
        case '\t': out += "\\t"; break;
        default: out += c;
        }
    }
    out += "'";
    return out;
}

/// @brief Double single-quotes for SQL string literals.
inline std::string sqlQuote(const std::string& s)
{
    std::string out;
    for (char c : s)
        out += (c == '\'') ? "''" : std::string(1, c);
    return out;
}

/// @brief Percent-encode @p s for use in a URL query value.
inline std::string urlEncode(const std::string& s)
{
    static const char* hex = "0123456789ABCDEF";
    std::string out;
    for (unsigned char c : s) {
        if (isalnum(c) || c == '-' || c == '_' || c == '.' || c == '~')
            out += (char)c;
        else {
            out += '%';
            out += hex[c >> 4];
            out += hex[c & 0x0f];
        }
    }
    return out;
}

} // namespace vault::rotator
