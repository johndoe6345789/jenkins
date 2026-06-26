#include "dashy.h"
#include <iostream>

static void usage(const char* p) {
    std::cerr
        << "Usage:\n"
        << "  " << p << " backup  <url> <apikey|-> <out.json>\n"
        << "  " << p << " restore <url> <apikey|-> <in.json>\n"
        << "  Pass '-' as apikey for unauthenticated instances.\n";
}

int main(int argc, char** argv) {
    if (argc != 5) { usage(argv[0]); return 1; }

    std::string cmd  = argv[1];
    std::string url  = argv[2];
    std::string key  = argv[3];
    std::string file = argv[4];

    while (!url.empty() && url.back() == '/')
        url.pop_back();

    try {
        if (cmd == "backup") {
            std::cout << "Backing up Dashy config to "
                      << file << "...\n";
            dashy::backup(url, key, file);
            std::cout << "Done: " << file << "\n";
        } else if (cmd == "restore") {
            std::cout << "Restoring Dashy config from "
                      << file << "...\n";
            dashy::restore(url, key, file);
        } else {
            std::cerr << "Unknown command: " << cmd << "\n";
            usage(argv[0]);
            return 1;
        }
    } catch (const std::exception& e) {
        std::cerr << "Error: " << e.what() << "\n";
        return 1;
    }
    return 0;
}
