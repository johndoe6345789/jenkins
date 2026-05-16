#!/bin/sh
set -eu

: "${NEXUS_BASE_URL:=http://nexus:8081}"
: "${NEXUS_ADMIN_USER:=admin}"
: "${NEXUS_ADMIN_PASSWORD:?NEXUS_ADMIN_PASSWORD is required}"
: "${NEXUS_DOCKER_REPOSITORY:=docker-hosted}"
: "${NEXUS_DOCKER_HOSTED_PORT:=5001}"

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

if grep -q "\"name\" : \"${NEXUS_DOCKER_REPOSITORY}\"" /tmp/nexus-repositories.json; then
  echo "Nexus repository ${NEXUS_DOCKER_REPOSITORY} already exists."
  exit 0
fi

echo "Creating Nexus Docker hosted repository ${NEXUS_DOCKER_REPOSITORY} on port ${NEXUS_DOCKER_HOSTED_PORT}..."
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
    "policyNames": []
  },
  "component": {
    "proprietaryComponents": false
  }
}
EOF

curl -fsS \
  -u "$auth" \
  -H "Content-Type: application/json" \
  -X POST \
  --data @/tmp/docker-hosted.json \
  "${NEXUS_BASE_URL}/service/rest/v1/repositories/docker/hosted"

echo "Nexus Docker repository ${NEXUS_DOCKER_REPOSITORY} created."
