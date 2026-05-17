#!/bin/sh
set -eu

: "${NEXUS_BASE_URL:=http://nexus:8081}"
: "${NEXUS_ADMIN_USER:=admin}"
: "${NEXUS_ADMIN_PASSWORD:?NEXUS_ADMIN_PASSWORD is required}"
: "${NEXUS_DOCKER_REPOSITORY:=docker-hosted}"
: "${NEXUS_DOCKER_HOSTED_PORT:=5001}"
: "${NEXUS_CLEANUP_POLICY:=docker-hosted-retain}"
: "${NEXUS_CLEANUP_MAX_AGE_DAYS:=14}"

auth="${NEXUS_ADMIN_USER}:${NEXUS_ADMIN_PASSWORD}"

echo "Waiting for Nexus at ${NEXUS_BASE_URL}..."
until curl -fsS -u "$auth" "${NEXUS_BASE_URL}/service/rest/v1/repositories" >/tmp/nexus-repositories.json; do
  sleep 5
done

# Newer Nexus Community Edition gates every repository behind EULA acceptance;
# until accepted, all repo endpoints (incl. the docker connector) return 403.
echo "Ensuring Nexus EULA is accepted..."
curl -fsS -u "$auth" -H "Accept: application/json" \
  "${NEXUS_BASE_URL}/service/rest/v1/system/eula" >/tmp/nexus-eula.json
if grep -q '"accepted"[: ]*true' /tmp/nexus-eula.json; then
  echo "Nexus EULA already accepted."
else
  sed 's/"accepted"[: ]*false/"accepted":true/' /tmp/nexus-eula.json >/tmp/nexus-eula-accept.json
  curl -fsS -u "$auth" -H "Content-Type: application/json" -X POST \
    --data @/tmp/nexus-eula-accept.json \
    "${NEXUS_BASE_URL}/service/rest/v1/system/eula"
  echo "Accepted Nexus EULA."
fi

# The Docker registry V2 token handshake requires the DockerToken realm to be
# active; without it Nexus answers /v2/ with a bare 403 (no WWW-Authenticate)
# and `docker login` fails. Ensure it idempotently, preserving other realms.
echo "Ensuring Docker Bearer Token realm is active..."
curl -fsS -u "$auth" "${NEXUS_BASE_URL}/service/rest/v1/security/realms/active" >/tmp/nexus-realms.json
if grep -q 'DockerToken' /tmp/nexus-realms.json; then
  echo "DockerToken realm already active."
else
  realms="$(tr -d ' \n' </tmp/nexus-realms.json | sed 's/]$/,"DockerToken"]/')"
  curl -fsS -u "$auth" -H "Content-Type: application/json" -X PUT \
    --data "$realms" \
    "${NEXUS_BASE_URL}/service/rest/v1/security/realms/active"
  echo "Enabled DockerToken realm."
fi

# CI registry retention. Every base/app push adds an immutable sha-<gitsha>
# tag; without a policy those accumulate forever and exhaust the (limited)
# host disk. This age-based policy expires versions whose blob has not been
# updated in ${NEXUS_CLEANUP_MAX_AGE_DAYS} days. `latest` is re-pushed every
# build so its blob timestamp keeps resetting and it never ages out; only the
# stale per-commit sha-* tags expire. The built-in "Cleanup service" task
# applies the policy and "Cleanup unused docker blobs" reclaims the disk
# (both also driven on demand by the nexus-housekeeping Jenkins job). The
# v1 cleanup-policies API is absent on this CE build; the UI-internal
# endpoint is the supported path on Nexus 3.92.
echo "Ensuring Nexus cleanup policy ${NEXUS_CLEANUP_POLICY}..."
curl -fsS -u "$auth" \
  "${NEXUS_BASE_URL}/service/rest/internal/cleanup-policies" \
  >/tmp/nexus-cleanup-policies.json
if grep -q "\"name\"[: ]*\"${NEXUS_CLEANUP_POLICY}\"" /tmp/nexus-cleanup-policies.json; then
  echo "Cleanup policy ${NEXUS_CLEANUP_POLICY} already exists."
else
  cat >/tmp/cleanup-policy.json <<EOF
{
  "name": "${NEXUS_CLEANUP_POLICY}",
  "format": "docker",
  "notes": "CI registry retention: expire image versions not updated in ${NEXUS_CLEANUP_MAX_AGE_DAYS} days. 'latest' is re-pushed every build so it never ages out; stale per-commit sha-* tags expire.",
  "criteriaLastBlobUpdated": ${NEXUS_CLEANUP_MAX_AGE_DAYS},
  "criteriaLastDownloaded": null,
  "criteriaReleaseType": null,
  "criteriaAssetRegex": null
}
EOF
  curl -fsS -u "$auth" -H "Content-Type: application/json" -X POST \
    --data @/tmp/cleanup-policy.json \
    "${NEXUS_BASE_URL}/service/rest/internal/cleanup-policies"
  echo "Created cleanup policy ${NEXUS_CLEANUP_POLICY} (lastBlobUpdated ${NEXUS_CLEANUP_MAX_AGE_DAYS}d)."
fi

# Desired docker-hosted definition, with the cleanup policy attached. PUT is
# idempotent, so converge whether or not the repo already exists (the old
# early-exit never attached the policy to a pre-existing repo).
cat >/tmp/docker-hosted.json <<EOF
{
  "name": "${NEXUS_DOCKER_REPOSITORY}",
  "online": true,
  "storage": {
    "blobStoreName": "default",
    "strictContentTypeValidation": true,
    "writePolicy": "allow"
  },
  "docker": {
    "v1Enabled": false,
    "forceBasicAuth": true,
    "httpPort": ${NEXUS_DOCKER_HOSTED_PORT}
  },
  "cleanup": {
    "policyNames": ["${NEXUS_CLEANUP_POLICY}"]
  },
  "component": {
    "proprietaryComponents": false
  }
}
EOF

if grep -q "\"name\" : \"${NEXUS_DOCKER_REPOSITORY}\"" /tmp/nexus-repositories.json; then
  echo "Repository ${NEXUS_DOCKER_REPOSITORY} exists; converging config (attach ${NEXUS_CLEANUP_POLICY})..."
  curl -fsS \
    -u "$auth" \
    -H "Content-Type: application/json" \
    -X PUT \
    --data @/tmp/docker-hosted.json \
    "${NEXUS_BASE_URL}/service/rest/v1/repositories/docker/hosted/${NEXUS_DOCKER_REPOSITORY}"
  echo "Repository ${NEXUS_DOCKER_REPOSITORY} updated."
else
  echo "Creating Nexus Docker hosted repository ${NEXUS_DOCKER_REPOSITORY} on port ${NEXUS_DOCKER_HOSTED_PORT}..."
  curl -fsS \
    -u "$auth" \
    -H "Content-Type: application/json" \
    -X POST \
    --data @/tmp/docker-hosted.json \
    "${NEXUS_BASE_URL}/service/rest/v1/repositories/docker/hosted"
  echo "Nexus Docker repository ${NEXUS_DOCKER_REPOSITORY} created."
fi
