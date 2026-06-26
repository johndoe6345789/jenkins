#pragma once
#include <string>

namespace cap {

std::string login(const std::string& url,
                  const std::string& password);
void backup(const std::string& url, const std::string& token,
            const std::string& outPath);
void restore(const std::string& url, const std::string& token,
             const std::string& inPath);

} // namespace cap
