# Demo credentials

Hobby-project, throwaway-server demo logins. Compiled by sweeping committed
seed SQL, compose files, and JCasC config across all sibling repos. Nothing
here is production — rotate or remove anything if this stack ever stops being
disposable.

Sources are linked per row so you can trace each value back to where the repo
applies it.

## Jenkins

| What | Login | URL | Source |
| --- | --- | --- | --- |
| Jenkins UI | `uksodev` / `nY53RyXdtxMdpcHHH09SXweT6afrNdiV` | http://localhost:8081 | `secrets/jenkins.env` → JCasC re-applies on every boot from `JENKINS_UKSODEV_PASSWORD` |
| Nexus admin (legacy) | `admin` / `4bbdce5c9a04959c52a44dc3e71e2747` | n/a | `secrets/jenkins.env` — Nexus was replaced by unauthenticated `registry:2` on `:5001`; kept as a record |
| Agent SSH key | user `jenkins`, ed25519 private key inline | n/a | `secrets/credentials.yaml` — matching pubkey baked into agent images; mismatch ⇒ all 8 agents offline |
| Docker registry | no auth | http://localhost:5001 | `docker-compose.yml` runs `registry:2` insecure |

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

## Notes for re-deriving this file

When you wipe `secrets/` (see `CLAUDE.md` recovery flow) the only Jenkins row
that survives is `JENKINS_UKSODEV_PASSWORD` — it's regenerated to whatever
you put in the rebuilt `secrets/jenkins.env`. Every other row above comes
from files inside the repos themselves and is stable across rebuilds.
