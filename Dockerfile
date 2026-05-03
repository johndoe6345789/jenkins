FROM jenkins/jenkins:lts-jdk17

USER root

# System tools + C++/CMake toolchain
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    cmake \
    ninja-build \
    gcc \
    g++ \
    clang \
    clang-format \
    clang-tidy \
    libssl-dev \
    pkg-config \
    curl \
    git \
    ca-certificates \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Conan 2
RUN pip3 install --break-system-packages conan

# Node.js LTS via NodeSource
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# pnpm (optional but useful for Next.js monorepos)
RUN npm install -g pnpm

# Pre-install Jenkins plugins
COPY plugins.txt /usr/share/jenkins/ref/plugins.txt
RUN jenkins-plugin-cli --plugin-file /usr/share/jenkins/ref/plugins.txt

USER jenkins
