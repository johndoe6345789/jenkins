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
credential used by every configured SSH agent.

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
images. The Compose default is `DOCKER_GID=984`, which matches this host's
socket mapping inside the containers. If your Docker socket maps to a different
group id, set `DOCKER_GID` before starting Compose:

```sh
export DOCKER_GID="984"
docker compose up -d --build
```

The MetaBuilder Jenkins job is written for limited disk space:

- prunes old local MetaBuilder images before building
- deletes an existing Nexus component for the same image tag before pushing
- removes local registry tags and source images after each push
- prunes old BuildKit cache after pushes

## Jobs

Pipeline job definitions live in `jobs/` as Jenkins XML configs. Apply the
MetaBuilder job with:

```sh
curl -c /tmp/jenkins-cookies \
  -u uksodev:$JENKINS_UKSODEV_PASSWORD \
  http://localhost:8081/crumbIssuer/api/json

curl -b /tmp/jenkins-cookies \
  -u uksodev:$JENKINS_UKSODEV_PASSWORD \
  -H "Jenkins-Crumb: <crumb-from-previous-response>" \
  -H "Content-Type: application/xml" \
  --data-binary @jobs/metabuilder.xml \
  "http://localhost:8081/createItem?name=metabuilder"
```
