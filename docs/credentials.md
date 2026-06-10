# Demo credentials

Hobby-project, throwaway-server demo logins. Compiled by sweeping committed
seed SQL, compose files, and JCasC config across all sibling repos. Nothing
here is production — rotate or remove anything if this stack ever stops being
disposable.

Sources are linked per row so you can trace each value back to where the repo
applies it.

## Jenkins

Ports: UI `:8081` (nginx → jenkins:8080), resource root `:8082`, JNLP
inbound agent port `:50000`, Docker registry `:5001`.

### Users (`casc.yaml` — `securityRealm.local`)

Both accounts survive every restart; JCasC re-applies them on every boot.
Anonymous read is disabled (`allowAnonymousRead: false`).

| User | Password | Source |
| --- | --- | --- |
| `uksodev` | `nY53RyXdtxMdpcHHH09SXweT6afrNdiV` | `secrets/jenkins.env` `JENKINS_UKSODEV_PASSWORD`; regenerated each `secrets` run |
| `admin` | see `secrets/jenkins.env` `JENKINS_ADMIN_PASSWORD` | `casc.yaml` — JCasC re-applies on every boot |

### JCasC credentials (`secrets/credentials.yaml`)

Loaded at every controller boot alongside `casc.yaml`.

| Credential ID | Type / scope | Resolved value | Purpose |
| --- | --- | --- | --- |
| `jenkins-agent-ssh-key` | SSH private key, SYSTEM, user `jenkins` | ed25519 key inline (see file) | Used by all 8 permanent SSH nodes (`agent-1..8`); mismatch → all agents offline |
| `nexus-admin` | Username/password, GLOBAL | `admin` / `4bbdce5c9a04959c52a44dc3e71e2747` | Legacy Nexus push credential kept in store; values interpolated from `secrets/nexus.env` (`NEXUS_ADMIN_USER` / `NEXUS_ADMIN_PASSWORD`) |

Agent SSH public key — baked into every agent image via `JENKINS_AGENT_SSH_PUBKEY`
in `docker-compose.yml` (update + rebuild all 8 agents if the key is rotated):

```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAINPCCdpG9EpNhiLiLoJgeC4ELi0KDVmMSSDQcbD8zIG/ jenkins-agent
```

### Docker registry (`:5001`)

`registry:2` with no authentication — jobs push/pull without `docker login`.
`NEXUS_REGISTRY=localhost:5001` in `secrets/nexus.env` is the endpoint
reference consumed by jobs (name kept for backward compatibility; Nexus itself
is gone).

## businessplanner

Keycloak is the user-facing IdP. The `users` service also seeds an older
legacy set of accounts directly into Postgres via migration SQL — both sets
exist in parallel on a fresh `up`.

### Keycloak

| What | Login | URL | Source |
| --- | --- | --- | --- |
| Keycloak master admin | `admin` / `admin` | http://localhost:8080 | `docker-compose.yml` (`KEYCLOAK_ADMIN` / `KEYCLOAK_ADMIN_PASSWORD`) |
| Keycloak DB (postgres) | `keycloak` / `keycloak_dev` | — | `docker-compose.yml` (`KC_DB_*`) |

Realm users (from `docker/keycloak/realm-export.json`, also mirrored in
`services/users/seeds/users.json`):

| Username | Password | Email | Role |
| --- | --- | --- | --- |
| `devadmin` | `DevAdmin1` | dev.admin@businessplanner.local | admin |
| `devuser`  | `DevUser1`  | dev.user@businessplanner.local  | user  |
| `devmod`   | `DevMod1a`  | dev.mod@businessplanner.local   | moderator |

### Legacy app-DB users

Seeded by `services/users/migrations/003_seed_data.sql`. Password hash is
PBKDF2-SHA256, 600k iter; plaintext given in the migration comments:

| Username | Password | Email | Role |
| --- | --- | --- | --- |
| `admin`    | `Admin123!` | admin@businessplanner.local | admin |
| `testuser` | `User123!`  | user@businessplanner.local  | user  |
| `system`   | (same hash as admin) | noreply@businessplanner.local | admin |

`apidemo` is referenced in `services/comments/migrations/002_seed_comments.sql`
but has no seeded login — it's an orphan, comments will fail to attach unless
you create it.

### Infra

| What | Login | Source |
| --- | --- | --- |
| pgAdmin proxy (`services/database/admin`) | `admin` / `admin` | `migrations/002_seed_admin.sql` (bcrypt hash) |
| Most service JWTs | `JWT_SECRET=dev-secret-change-in-production` | `docker-compose.yml` (multiple services) |

## next_extra_primary

Same shape as businessplanner — same passwords, only the email domain
changes from `@businessplanner.local` to `@nextra.local`.

### Keycloak

| What | Login | URL |
| --- | --- | --- |
| Keycloak master admin | `admin` / `admin` | http://localhost:8080 |
| Keycloak DB | `keycloak` / `keycloak_dev` | — |

Realm users (`docker/keycloak/realm-export.json`,
`services/users/seeds/users.json`):

| Username | Password | Email | Role |
| --- | --- | --- | --- |
| `devadmin` | `DevAdmin1` | dev.admin@nextra.local | admin |
| `devuser`  | `DevUser1`  | dev.user@nextra.local  | user  |
| `devmod`   | `DevMod1a`  | dev.mod@nextra.local   | moderator |

### Legacy app-DB users

`services/users/migrations/003_seed_data.sql`:

| Username | Password | Email | Role |
| --- | --- | --- | --- |
| `admin`    | `Admin123!` | admin@nextra.local | admin |
| `testuser` | `User123!`  | user@nextra.local  | user  |
| `system`   | (same hash as admin) | noreply@nextra.local | admin |

### Infra

| What | Login | Source |
| --- | --- | --- |
| pgAdmin proxy | `admin` / `admin` | `services/database/admin/backend/migrations/002_seed_admin.sql` |
| Most service JWTs | `JWT_SECRET=dev-secret-change-in-production` | `docker-compose.yml` |

## metabuilder frontends

`metabuilder/frontends/<name>/` — each frontend is its own app with its own
demo login. Only the ones with committed defaults are listed.

| Frontend | Login / value | Source |
| --- | --- | --- |
| `nextjs` (main metabuilder UI) | `demo` / `demo` (user, L2) — mock data also includes `admin` (admin@metabuilder.dev) | `src/app/app/god-panel/page.tsx`, `src/app/app/admin/page.tsx` |
| `nextjs` | `DBAL_NATIVE_PRISMA_TOKEN=local-dbal-token` | `.env.example` (token used by the C++ daemon's NativePrismaAdapter) |
| `packagerepo` | `admin` / `admin` | `docs/CAPROVER.md`, `backend/INTEGRATION_TEST.md` (bcrypt default in backend bootstrap) |
| `packagerepo` | `JWT_SECRET=dev-secret-change-in-production` | `docker-compose.yml` |
| `postgres` | `admin` / `admin123` (ADMIN_USERNAME / ADMIN_PASSWORD) | `docker-compose.yml` |
| `postgres` | `JWT_SECRET=your-secret-key-change-in-production` | `docker-compose.yml` |
| `dockerterminal` | `admin` / `admin123` (ADMIN_USERNAME / ADMIN_PASSWORD) | `docker-compose.yml` |
| `emailclient` | Postgres `emailclient` / `emailclient` | `docker-compose.yml`, `docker-compose.dev.yml` |
| `emailclient` | Redis `redis_development_password` | `docker-compose.dev.yml`, `deployment/docker/redis/.env.redis` |
| `qt6` | `DBAL_ADMIN_TOKEN=dev-token`, `JWT_SECRET_KEY=dev-secret` | `docker-compose.dev.yml` |
| `workflowui` | `NEXTAUTH_SECRET=change-me-in-production` (dev default) | `docker-compose.yml` |
| `workflowui` | `NEXTAUTH_SECRET=test-secret` (test env) | `.env.local.test` |
| `workflowui` | Gmail app pw via `GMAIL_APP_PASSWORD` — placeholder, not seeded | `docker-compose.yml` |

No committed demo creds in: `caproverforge`, `cli`, `codegen`, `dbal`,
`exploded-diagrams`, `pastebin`, `repoforge`.

## Other repos

| Repo | What | Value | Source |
| --- | --- | --- | --- |
| `hamradiosite` | JWT (dev) | `JWT_SECRET_KEY=dev-secret-key` | `docker-compose.dev.yml` |
| `webdevguide` | — | no committed demo creds | — |
| `nexus-command` | — | no committed demo creds | — |
| `strategy-execution-p` | — | no committed demo creds | — |
| `workforce-pay-bill-p` | — | no committed demo creds | — |

## Password management

Two separate CLIs cover rotation — one for Jenkins itself, one for every
sibling-repo frontend.

### Jenkins passwords — `scripts/setup.py reset-passwords`

Rotates the Jenkins UI accounts and the legacy nexus-admin credential.
New passwords are written back to the relevant `secrets/` file; the old
values are overwritten in place (no archive). JCasC re-applies on the next
boot, so pass `--restart` to make the change live immediately.

```sh
# Rotate all three targets (uksodev, admin, nexus-admin) — auto-generated
scripts/setup.py reset-passwords --show

# Rotate only the main login, print the new password
scripts/setup.py reset-passwords --targets uksodev --show

# Rotate and restart Jenkins in one step
scripts/setup.py reset-passwords --restart

# Set a specific password for one target
scripts/setup.py reset-passwords --targets admin --password 'MyPass123!'
```

Targets and their `secrets/` keys:

| Target | File | Env key |
| --- | --- | --- |
| `uksodev` | `secrets/jenkins.env` | `JENKINS_UKSODEV_PASSWORD` |
| `admin` | `secrets/jenkins.env` | `JENKINS_ADMIN_PASSWORD` |
| `nexus-admin` | `secrets/nexus.env` | `NEXUS_ADMIN_PASSWORD` |

### Frontend passwords — `scripts/rotator/rotate.py`

JSON-orchestrated rotator that covers all sibling-repo credentials. Each
target in `scripts/rotator/manifest.json` names an adapter that knows how
to apply the password to the live service.

```sh
# Show current status of all targets (read-only)
scripts/rotator/rotate.py status

# Rotate everything — auto-generated 32-char alphanumeric passwords
scripts/rotator/rotate.py rotate

# Rotate one target, print a preview without writing
scripts/rotator/rotate.py rotate --only postgres-dashboard-admin --dry-run

# Rotate one target with a specific password
scripts/rotator/rotate.py rotate --only packagerepo-admin --password 'MyPass123!'

# See what keys would be emitted without rotating
scripts/rotator/rotate.py generate
```

New passwords land in two places:

| File | Contents |
| --- | --- |
| `secrets/rotated.env` | Live merged view — all rotated keys, updated each run |
| `secrets/rotated/<timestamp>.env` | Per-run archive of keys touched that run |
| `secrets/rotated.history.json` | Metadata log (target name, adapter, result — no plaintext) |

Current manifest targets and their adapters:

| Target | Adapter | What it rotates |
| --- | --- | --- |
| `postgres-dashboard-admin` | `db_bcrypt` | metabuilder Postgres dashboard `admin` user |
| `packagerepo-admin` | `db_bcrypt` | metabuilder packagerepo `admin` user |
| `dockerterminal-admin` | `env_var` | metabuilder dockerterminal `ADMIN_PASSWORD` |
| `workflowui-nextauth-secret` | `env_var` | metabuilder workflowui `NEXTAUTH_SECRET` |
| `emailclient-redis` | `env_var` | metabuilder emailclient Redis password |
| `businessplanner-keycloak-devadmin` | `keycloak_realm` | businessplanner Keycloak `devadmin` realm user |
| `next-extra-primary-keycloak-devadmin` | `keycloak_realm` | next_extra_primary Keycloak `devadmin` realm user |

**Adapters:**
- `db_bcrypt` — connects to a named Postgres container, re-hashes with bcrypt and updates the row directly
- `env_var` — writes a new value into a `secrets/` env file then `docker compose` recreates the target service
- `keycloak_realm` — calls the Keycloak admin REST API to set the user's password in the specified realm

## Notes for re-deriving this file

When you wipe `secrets/` (see `CLAUDE.md` recovery flow) the only Jenkins row
that survives is `JENKINS_UKSODEV_PASSWORD` — it's regenerated to whatever
you put in the rebuilt `secrets/jenkins.env`. Every other row above comes
from files inside the repos themselves and is stable across rebuilds.
