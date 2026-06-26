#include "cap.h"
#include <iostream>

static void usage(const char* p) {
    std::cerr
        << "Usage:\n"
        << "  " << p << " backup  <url> <pw> <out.json>\n"
        << "  " << p << " restore <url> <pw> <in.json>\n";
}

int main(int argc, char** argv) {
    if (argc != 5) { usage(argv[0]); return 1; }

    std::string cmd  = argv[1];
    std::string url  = argv[2];
    std::string pw   = argv[3];
    std::string file = argv[4];

    while (!url.empty() && url.back() == '/')
        url.pop_back();

    try {
        std::cout << "Connecting to " << url << "...\n";
        auto tok = cap::login(url, pw);
        std::cout << "Authenticated.\n";

        if (cmd == "backup") {
            std::cout << "Backing up apps to " << file
                      << "...\n";
            cap::backup(url, tok, file);
            std::cout << "Done: " << file << "\n";
        } else if (cmd == "restore") {
            std::cout << "Restoring from " << file
                      << "...\n";
            cap::restore(url, tok, file);
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
