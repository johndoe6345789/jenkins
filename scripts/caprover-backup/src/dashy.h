#pragma once
#include <string>

namespace dashy {

void backup(const std::string& url, const std::string& key,
            const std::string& outPath);
void restore(const std::string& url, const std::string& key,
             const std::string& inPath);

} // namespace dashy
