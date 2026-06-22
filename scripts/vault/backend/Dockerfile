# syntax=docker/dockerfile:1
FROM debian:bookworm AS build

# gcc/g++/make: C & C++ deps (bzip2, etc). bison/flex/perl/zlib: building
# libpq from source (Drogon with_postgres). conan needs all of these present.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       ca-certificates cmake gcc g++ make ninja-build pkg-config python3-pip \
       bison flex perl zlib1g-dev libreadline-dev \
    && rm -rf /var/lib/apt/lists/*

RUN python3 -m pip install --break-system-packages --no-cache-dir conan

WORKDIR /src
COPY scripts/vault/backend ./scripts/vault/backend

WORKDIR /src/scripts/vault/backend
RUN --mount=type=cache,target=/root/.conan2 \
    rm -rf build CMakeUserPresets.json CMakePresets.json \
    && conan profile detect --force \
    && conan install . --output-folder=build --build=missing \
       -s build_type=Release \
    && cmake -S . -B build -G Ninja \
       -DCMAKE_TOOLCHAIN_FILE=build/conan_toolchain.cmake \
       -DCMAKE_BUILD_TYPE=Release \
    && cmake --build build \
    && cmake --install build --prefix /opt/vault

FROM debian:bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl gnupg \
       libstdc++6 libpq5 \
    && install -m 0755 -d /etc/apt/keyrings \
    && curl -fsSL https://download.docker.com/linux/debian/gpg \
       | gpg --dearmor -o /etc/apt/keyrings/docker.gpg \
    && echo "deb [arch=amd64 signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian bookworm stable" \
       > /etc/apt/sources.list.d/docker.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends docker-ce-cli \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=build /opt/vault /opt/vault
# Runtime only needs the manifest (rotation targets) and the SQL migrations.
# The Python rotator/adapters are superseded by the native vault-rotate binary.
COPY scripts/rotator/manifest.json ./scripts/rotator/manifest.json
COPY scripts/vault/backend/migrations ./scripts/vault/backend/migrations

ENV VAULT_REPO_ROOT=/app
EXPOSE 5050
CMD ["/opt/vault/bin/vault-server"]
