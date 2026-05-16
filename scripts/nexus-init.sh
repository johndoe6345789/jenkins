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
