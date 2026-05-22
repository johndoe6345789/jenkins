# CLAUDE.md — Jenkins CI stack

Docker Compose stack: a JCasC-configured Jenkins controller, an nginx front
end (`:8081` UI, `:8082` resource root), a lightweight `registry:2` Docker
registry on `:5001`, and **8 SSH build agents** (`jenkins-agent-1..8`). Agents
and the registry carry `restart: unless-stopped`; the controller is rebuilt
from `Dockerfile`.

> Nexus 3 was replaced by `registry:2` (insecure, no auth) — it freed the JVM
> RAM the old 4 GB host could not spare. Some prose below still says "Nexus";
> read it as the `registry:2` on `:5001`. Build jobs push without `docker
> login`; deployment is a separate `<app>-deploy` job set (see README).

## The #1 failure mode: wiped `secrets/`

`secrets/` is **gitignored** (`.gitignore` is literally `secrets/`). A host
rebuild / "server rearchitecture" deletes it. Then:

- `docker compose config` fails on the missing `env_file`s, so `jenkins` and
  `nginx` never start — but the agents/nexus keep running from before, which
  makes it look like a partial outage rather than a missing-file problem.
- The named volumes (`jenkins_jenkins_home`, `jenkins_nexus_data`,
  `*-home`) **survive**, so nothing is actually lost.

Recover **without rotating the agent key or rebuilding agents** — the key is
in the persisted `jenkins_jenkins_home` volume (encrypted in
`credentials.xml`, decryptable with that volume's `secrets/master.key` +
`hudson.util.Secret`); the Nexus admin password is the bootstrap value while
Nexus setup is unfinalized:

```sh
scripts/setup.py doctor                       # diagnoses exactly this
scripts/setup.py recover-key --out secrets/agent_key
scripts/setup.py secrets --import-ssh-key secrets/agent_key \
    --nexus-password "$(scripts/setup.py recover-key --print-nexus-only)"
scripts/setup.py up
```

Only if `jenkins_jenkins_home` is *also* gone is the key unrecoverable →
`secrets --rotate-ssh-key`, update `JENKINS_AGENT_SSH_PUBKEY` in
`docker-compose.yml`, rebuild all 8 agents.

## Management CLI

`scripts/setup.py` is a thin entrypoint over the `scripts/jenkins_stack/`
package (`cli`, `secretgen`, `recover`, `doctor`, `compose` modules — keep it
this shape: one entrypoint, logic in modules). It needs `cryptography` and
`jinja2`. Generated secret files are jinja2-rendered and chmod 0600. Prefer
`scripts/setup.py up` over raw `docker compose up -d --build`: it recreates
the controller/nginx **without rebuilding the running agents**.

## Non-obvious facts

- **DOCKER_GID** must match the host docker.sock GID and is *baked into the
  agent image* (not just `group_add`) because pipeline `sh` runs in an sshd
  login session — see `docs/agent-docker-socket.md`. Default `984`.
- The agent **public key is baked into the agent image**; the matching private
  key lives only in `secrets/credentials.yaml` (and, encrypted, in the home
  volume). Mismatch ⇒ all agents offline.
- JCasC re-applies `casc.yaml` + `secrets/credentials.yaml` on **every boot**;
  `JENKINS_UKSODEV_PASSWORD` from `secrets/jenkins.env` becomes the login pw
  each time, so it need not match any prior value.
- Jobs are XML in `jobs/`, pushed via the REST API (see README); the
  `metabuilder*` / `businessplanner*` split exists for a disk-constrained host.

## Agent auto-recovery

Jenkins agents go offline when disk space drops below 1 GiB. The root cause
is accumulated Docker build cache and images on the shared btrfs loop device.

**Manual one-shot recovery:**

```sh
scripts/setup.py recover-agents           # prune build cache + reconnect
scripts/setup.py recover-agents --verbose # see docker prune output
```

**Install a systemd timer (auto-recovery every 30 min):**

```sh
sudo scripts/setup.py recover-agents --install-timer
```

This writes `/etc/systemd/system/jenkins-agent-recover.{service,timer}`
and enables the timer immediately. On each tick it prunes builder cache
older than 24 h and dangling images, then reconnects any offline agents.

## next_extra_primary-apps BASE_REGISTRY note

The `businessplanner-base-conan` image is published under
`localhost:5001/johndoe6345789/businessplanner` (built by the `base-images`
job). The `next_extra_primary-apps` job must set:

```groovy
BASE_REGISTRY = 'localhost:5001/johndoe6345789/businessplanner'
```

NOT the nextra_extra_primary slug — otherwise targets like `nextra-migrate`
that use `${BASE_REGISTRY}/businessplanner-base-conan:latest` will fail with
"not found".

## Verify a repair

```sh
scripts/setup.py doctor          # all green except cosmetic "nexus-init not running"
# 9/9 nodes online (built-in + agent-1..8) proves the agent key works:
curl -gsS -u uksodev:$PW 'http://localhost:8081/computer/api/json?tree=computer[displayName,offline]'
```
