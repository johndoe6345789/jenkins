# Agent Docker socket access

Jenkins jobs build and push Docker images from the SSH build agents. The agents
reach Docker through the host socket mounted by `docker-compose.yml`
(`/var/run/docker.sock`). This note explains the group-id requirement, a
non-obvious failure mode, and how it is fixed in this repo.

## Symptom

Pipeline `sh` steps fail at the Docker preflight stage even though the Docker
CLI itself is installed:

```
+ docker version
Client: Docker Engine - Community
 Version:           29.5.0
 ...
permission denied while trying to connect to the docker API at unix:///var/run/docker.sock
```

Confusingly, `docker exec -u jenkins jenkins-agent-1 docker version` against the
same container **succeeds**. That discrepancy is the key to the root cause.

## Root cause

The host socket is `srw-rw---- root:<DOCKER_GID>`, so a process needs group
`DOCKER_GID` to talk to the Docker API.

`docker-compose.yml` adds that group with:

```yaml
group_add:
  - "${DOCKER_GID:-984}"
```

`group_add` adds the supplementary GID to the **container's main process and
any `docker exec`-spawned process** — which is why the manual `docker exec`
test works.

But the `jenkins/ssh-agent` base image runs `sshd`, and Jenkins runs every
pipeline `sh` step inside an **SSH login session**. sshd/PAM rebuilds the
session's group set from `/etc/group` via `initgroups()`. A GID that exists
only as a runtime `group_add` supplementary group — with no matching entry in
`/etc/group` — is **not** inherited by the SSH login session. The pipeline
shell therefore runs without `DOCKER_GID` and is denied the socket.

## Fix

The `jenkins` user must be a **static member of a group whose GID matches the
host socket**, baked into the agent image so PAM picks it up on login.
`Dockerfile.agent`:

```dockerfile
ARG DOCKER_GID=984
RUN set -eux; \
    existing="$(getent group "${DOCKER_GID}" | cut -d: -f1 || true)"; \
    if [ -z "$existing" ]; then groupadd -g "${DOCKER_GID}" docker; existing=docker; fi; \
    usermod -aG "$existing" jenkins
```

`docker-compose.yml` passes the GID as a build arg so the baked-in group always
matches the runtime socket, and keeps `group_add` as belt-and-suspenders for
the `docker exec` path:

```yaml
build:
  context: .
  dockerfile: Dockerfile.agent
  args:
    DOCKER_GID: "${DOCKER_GID:-984}"
```

## Setting DOCKER_GID for a different host

The default `984` matches this host. On a host whose Docker socket maps to a
different group, set `DOCKER_GID` before building so both the static group and
`group_add` line up:

```sh
export DOCKER_GID="$(stat -c '%g' /var/run/docker.sock)"
docker compose build jenkins-agent-1 ... jenkins-agent-8
docker compose up -d --no-deps jenkins-agent-1 ... jenkins-agent-8
```

## Verifying the fix

`su` reinitializes groups via PAM/`initgroups()` exactly like an sshd login, so
it reproduces the pipeline `sh` environment:

```sh
docker exec jenkins-agent-1 getent group "$(stat -c '%g' /var/run/docker.sock)"
# -> docker:x:984:jenkins      (jenkins is a STATIC member)

docker exec jenkins-agent-1 su -s /bin/sh jenkins -c 'id; docker version'
# -> groups=...,984(docker)   and   Server: Docker Engine ...
```

If the second command prints the socket version (not "permission denied"), the
pipeline agents have working Docker access.
