cmake_minimum_required(VERSION 3.16)
project(caprover-backup CXX)
set(CMAKE_CXX_STANDARD 17)

find_package(CURL             REQUIRED CONFIG)
find_package(nlohmann_json    REQUIRED CONFIG)

add_executable(caprover-backup
    src/main.cpp
    src/cap_auth.cpp
    src/cap_io.cpp
)
target_link_libraries(caprover-backup PRIVATE
    CURL::libcurl
    nlohmann_json::nlohmann_json
)
target_include_directories(caprover-backup PRIVATE src)

add_executable(dashy-backup
    src/dashy_main.cpp
    src/dashy.cpp
)
target_link_libraries(dashy-backup PRIVATE
    CURL::libcurl
    nlohmann_json::nlohmann_json
)
target_include_directories(dashy-backup PRIVATE src)
