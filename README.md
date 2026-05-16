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

The Jenkins login for `uksodev` is set through `secrets/jenkins.env`:

```sh
JENKINS_UKSODEV_PASSWORD=change-this-password
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

Nexus runs as `nexus` on the same Compose network as Jenkins. Use the UI at
http://localhost:8083 to create a hosted Docker repository and bind its HTTP
connector to port `5001`; the Compose file already exposes that port as
`localhost:5001`.

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
