#!/usr/bin/env bash
set -e
mkdir -p build
conan install . --output-folder=build --build=missing
cmake -S . -B build -G Ninja \
    -DCMAKE_TOOLCHAIN_FILE=build/conan_toolchain.cmake \
    -DCMAKE_BUILD_TYPE=Release
cmake --build build
echo "Built: build/caprover-backup  build/dashy-backup"
