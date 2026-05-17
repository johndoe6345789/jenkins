# Jenkins CI Stack

Docker Compose stack for a Jenkins controller, an nginx front end, and eight
SSH-based Linux build agents for C++/CMake and npm/Next.js pipelines.

## Services

- Jenkins UI: http://localhost:8081
- Jenkins resource root: http://localhost:8082
- Nexus UI: http://localhost:8083
- Nexus Docker registry connector: `localhost:5001`
- Inbound agent port: `50000`
- SSH agents: `jenkins-agent-1` through `jenkins-agent-8`

## Credentials

Jenkins loads Configuration as Code from `casc.yaml` and the ignored local file
`secrets/credentials.yaml`. That file must define the `jenkins-agent-ssh-key`
credential used by every configured SSH agent, and the `nexus-admin`
username/password credential used by the MetaBuilder job to log in and push
images (its values interpolate from `secrets/nexus.env`, which the controller
already loads, so no secret is duplicated).

Start from the tracked templates:

```sh
mkdir -p secrets
cp secrets.example/credentials.yaml secrets/credentials.yaml
cp secrets.example/jenkins.env secrets/jenkins.env
cp secrets.example/nexus.env secrets/nexus.env
```

To rotate the agent key:

```sh
mkdir -p secrets
ssh-keygen -t ed25519 -N '' -C jenkins-agent -f /tmp/jenkins-agent-key
```

Put the private key into `secrets/credentials.yaml`:

```yaml
credentials:
  system:
    domainCredentials:
      - credentials:
          - basicSSHUserPrivateKey:
              scope: SYSTEM
              id: "jenkins-agent-ssh-key"
              description: "SSH key for Docker Jenkins agents"
              username: "jenkins"
              privateKeySource:
                directEntry:
                  privateKey: |
                    -----BEGIN OPENSSH PRIVATE KEY-----
                    ...
                    -----END OPENSSH PRIVATE KEY-----
```

Then update `JENKINS_AGENT_SSH_PUBKEY` in `docker-compose.yml` with:

```sh
cat /tmp/jenkins-agent-key.pub
```

## Run

```sh
docker compose up -d --build
```

If Docker previously created `secrets/credentials.yaml` as a directory, remove
that directory before starting the stack.

## Verify

```sh
docker compose config
docker compose ps
docker compose logs --tail 120 jenkins
```

## Nexus

Nexus runs as `nexus` on the same Compose network as Jenkins. The `nexus-init`
service creates a hosted Docker repository named `docker-hosted` and binds its
HTTP connector to port `5001`.

- Nexus UI: http://localhost:8083
- Docker registry: `localhost:5001`

The Jenkins agents mount the host Docker socket so jobs can build and push
images. Access requires a group matching the socket GID, and that group is
**baked into the agent image** as a static member of the `jenkins` user (not
only a runtime `group_add`) — otherwise pipeline `sh` steps, which run in an
sshd login session, lose the GID. See
[docs/agent-docker-socket.md](docs/agent-docker-socket.md) for the full
explanation.

The Compose default is `DOCKER_GID=984`, which matches this host's socket
mapping. On a host whose Docker socket maps to a different group id, set
`DOCKER_GID` so both the baked-in group and `group_add` line up, then rebuild:

```sh
export DOCKER_GID="$(stat -c '%g' /var/run/docker.sock)"
docker compose up -d --build
```

The MetaBuilder jobs are written for limited disk space:

- the base image is split into per-target conan bases
  (`base-conan-{cli,media,dbal,qt6,gameengine}`) instead of one 32GB
  `base-conan-deps`, so the app pipeline only needs the small `cli`/`media`
  bases and peak disk is per-image
- the apps job pulls the *last-good* base from Nexus rather than rebuilding it,
  and never deletes the base images it builds FROM (the build #9 cascade)
- only a build-safe, time-filtered BuildKit cache prune runs in-job; image
  reclamation is owned by the `docker-housekeeping` job
- deletes an existing Nexus component for the same image tag before pushing
- removes local registry tags and source images after each push

## Jobs

Pipeline job definitions live in `jobs/` as Jenkins XML configs. The MetaBuilder
pipeline is split into four jobs so the build is no longer monolithic and stays
within the disk-constrained host:

- **`metabuilder-base-images`** (`jobs/metabuilder-base-images.xml`) — the
  routine app-path bases (apt, node-deps, pip-deps, android-sdk, conan-cli,
  conan-media). **Disk-safe serial pipeline:** each base is built, pushed to
  Nexus, then pruned locally *before* the next, so peak local disk is roughly
  one base image, not the sum. `base-apt` is kept resident until its local
  dependents are built, then dropped.
- **`metabuilder-base-heavy`** (`jobs/metabuilder-base-heavy.xml`) — occasional,
  disk-gated. The big dev/standalone-only conan bases (conan-dbal, conan-qt6,
  conan-gameengine), same build→push→prune-per-image pattern; hydrates
  `base-apt` from Nexus rather than rebuilding it. `devcontainer` (~41 GB) is
  intentionally **not** automated — build it manually on a larger host.
- **`metabuilder-apps`** (`jobs/metabuilder-apps.xml`) — light and frequent.
  Pulls the *last-good* base images from Nexus, retags them locally, builds the
  app images and pushes them. It never rebuilds base images, so a missing or
  failed base no longer cascades into `pull access denied for
  metabuilder/base-apt` (the build #9 failure).
- **`metabuilder`** (`jobs/metabuilder.xml`) — thin orchestrator for a
  one-button release: runs `metabuilder-base-images` then `metabuilder-apps`
  (not the heavy job). A disk-gated/UNSTABLE base does **not** block apps.

The base jobs hold a `mb-base-running` Docker volume as a cross-agent lock;
`docker-housekeeping` skips its prune while that lock is present so a concurrent
prune cannot evict base images mid-build.

The orchestrator references the others by job name, so create all four (the
names must match exactly):

```sh
curl -c /tmp/jenkins-cookies \
  -u uksodev:$JENKINS_UKSODEV_PASSWORD \
  http://localhost:8081/crumbIssuer/api/json

for job in metabuilder-base-images metabuilder-base-heavy metabuilder-apps metabuilder; do
  curl -b /tmp/jenkins-cookies \
    -u uksodev:$JENKINS_UKSODEV_PASSWORD \
    -H "Jenkins-Crumb: <crumb-from-previous-response>" \
    -H "Content-Type: application/xml" \
    --data-binary @jobs/$job.xml \
    "http://localhost:8081/createItem?name=$job"
done
```

Update an existing job instead of creating it by POSTing the same XML to
`http://localhost:8081/job/<name>/config.xml`.

### businessplanner

[businessplanner](https://github.com/johndoe6345789/businessplanner) (the
Nextra / `next_extra_primary` monorepo) is wired in with the same atomic split,
driven by its own infra-as-code (`.local/docker/nextra-base-*.Dockerfile`,
`docker-compose.yml`, `docker-bake.hcl` — the Jenkins jobs mirror
`.github/workflows/nextra-base-images.yml` and `build-and-push.yml`):

- **`businessplanner-base-images`** (`jobs/businessplanner-base-images.xml`) —
  heavy and infrequent. Disk-safe serial build of `nextra-base-apt` →
  `nextra-base-conan` → `nextra-base-node`, each built, pushed to Nexus, then
  pruned locally *before* the next. `nextra-base-apt` is kept resident because
  `nextra-base-conan` builds `FROM` it, then dropped at the end.
- **`businessplanner-apps`** (`jobs/businessplanner-apps.xml`) — light and
  frequent. One inner stage per `docker-bake.hcl` `default` target: `docker
  buildx bake` (compose + bake), push to Nexus, prune, in turn. Base images
  resolve from Nexus via the bake `DEPS_IMAGE`/`APT_IMAGE` args, so it never
  rebuilds bases; one failing target marks the build UNSTABLE, not aborted.
- **`businessplanner`** (`jobs/businessplanner.xml`) — thin orchestrator: runs
  `businessplanner-base-images` (propagate:false) then `businessplanner-apps`.

Images publish to `localhost:5001/johndoe6345789/next_extra_primary/<name>`
(matching the `docker-bake.hcl` `REGISTRY` variable). The base job reuses the
same `mb-base-running` lock, so `docker-housekeeping` also backs off during a
businessplanner base build. Create/update them the same way as the MetaBuilder
jobs:

```sh
for job in businessplanner-base-images businessplanner-apps businessplanner; do
  curl -b /tmp/jenkins-cookies \
    -u uksodev:$JENKINS_UKSODEV_PASSWORD \
    -H "Jenkins-Crumb: <crumb-from-previous-response>" \
    -H "Content-Type: application/xml" \
    --data-binary @jobs/$job.xml \
    "http://localhost:8081/createItem?name=$job"
done
```

`businessplanner-apps` runs `docker buildx bake`, so the agent image now
installs `docker-buildx-plugin` (`Dockerfile.agent`). Rebuild the agents after
pulling this change:

```sh
docker compose up -d --build jenkins-agent-1 jenkins-agent-2 jenkins-agent-3 \
  jenkins-agent-4 jenkins-agent-5 jenkins-agent-6 jenkins-agent-7 jenkins-agent-8
```

## Appearance and plugins

The UI uses the built-in **Dark Theme** plugin, forced globally and locked
through Configuration as Code (`casc.yaml`):

```yaml
appearance:
  themeManager:
    disableUserThemes: true
    theme: "dark"
```

It pulls no external resources, so it works under the enforced
Content-Security-Policy without any CSP changes.

Beyond the pipeline/SCM core, `plugins.txt` adds:

- **Pipeline:** `pipeline-graph-view` (modern stage view), `pipeline-utility-steps`,
  `ws-cleanup` (per-build workspace cleanup), `build-timeout` (abort hung builds)
- **GitHub:** `github-branch-source` (multibranch/PR builds), `github-checks`
  (status reported back to GitHub PRs)
- **Quality:** `coverage` (lcov/cobertura), `htmlpublisher` (HTML reports),
  `xunit` (ctest and other non-JUnit results)

Plugins are baked into the controller image at build time
(`Dockerfile`), so changing `plugins.txt` requires a rebuild:

```sh
docker compose build jenkins
docker compose up -d --no-deps jenkins
```

## Housekeeping (disk reclamation)

`jobs/docker-housekeeping.xml` is a scheduled pipeline job (cron `H */6 * * *`)
that reclaims Docker disk on the agent host. It is a deliberate stopgap for a
disk-constrained host until a bigger disk/SSD is available. The prune is
**build-safe**: it uses time filters (`until=48h` for build cache, `until=24h`
for stopped containers) plus dangling-image cleanup, so a concurrently running
build's recent layers and cache are never evicted. It intentionally avoids
`docker image prune -a`, `docker volume prune`, and `docker system prune -a`,
which would remove base images and named volumes the builds and stack depend
on. Apply it the same way as the MetaBuilder job:

```sh
curl -b /tmp/jenkins-cookies \
  -u uksodev:$JENKINS_UKSODEV_PASSWORD \
  -H "Jenkins-Crumb: <crumb>" \
  -H "Content-Type: application/xml" \
  --data-binary @jobs/docker-housekeeping.xml \
  "http://localhost:8081/createItem?name=docker-housekeeping"
```

The MetaBuilder pipeline also cleans its own workspace (`post { cleanWs() }`)
and caps build retention (`logRotator`) to bound growth between prunes.
