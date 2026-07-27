cmake_minimum_required(VERSION 3.20)
project(vault-backend LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

find_package(Drogon REQUIRED)
find_package(OpenSSL REQUIRED)
find_package(CURL REQUIRED)
find_package(PostgreSQL REQUIRED)

# ── shared core: crypto, services, rotator, adapters ──────────────────────────
# Globbed so each <=80 LOC unit stays its own file (house C++ standard) without
# a hand-maintained source list. main.cpp / rotator_main.cpp are entrypoints and
# excluded so the library can back both executables.
file(GLOB_RECURSE VAULT_CORE_SRC CONFIGURE_DEPENDS
    "${CMAKE_CURRENT_SOURCE_DIR}/src/crypto/*.cpp"
    "${CMAKE_CURRENT_SOURCE_DIR}/src/services/*.cpp"
    "${CMAKE_CURRENT_SOURCE_DIR}/src/rotator/*.cpp"
)

add_library(vaultcore STATIC ${VAULT_CORE_SRC})
target_include_directories(vaultcore
    PUBLIC ${CMAKE_CURRENT_SOURCE_DIR}/src
)
target_link_libraries(vaultcore
    PUBLIC
        Drogon::Drogon
        OpenSSL::SSL
        OpenSSL::Crypto
        CURL::libcurl
        libpq::pq
)

# ── HTTP API server ───────────────────────────────────────────────────────────
file(GLOB VAULT_CTRL_SRC CONFIGURE_DEPENDS
    "${CMAKE_CURRENT_SOURCE_DIR}/src/controllers/*.cpp"
    "${CMAKE_CURRENT_SOURCE_DIR}/src/filters/*.cpp"
)

add_executable(vault-server src/main.cpp ${VAULT_CTRL_SRC})
target_link_libraries(vault-server PRIVATE vaultcore)
install(TARGETS vault-server RUNTIME DESTINATION bin)

# ── rotator CLI (drop-in for rotate.py) ───────────────────────────────────────
add_executable(vault-rotate src/rotator_main.cpp)
target_link_libraries(vault-rotate PRIVATE vaultcore)
install(TARGETS vault-rotate RUNTIME DESTINATION bin)
