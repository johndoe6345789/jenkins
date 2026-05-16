# Jenkins CI Stack

Docker Compose stack for a Jenkins controller, an nginx front end, and eight
SSH-based Linux build agents for C++/CMake and npm/Next.js pipelines.

## Services

- Jenkins UI: http://localhost:8081
- Jenkins resource root: http://localhost:8082
- Inbound agent port: `50000`
- SSH agents: `jenkins-agent-1` through `jenkins-agent-8`

## Credentials

Jenkins loads Configuration as Code from `casc.yaml` and the ignored local file
`secrets/credentials.yaml`. That file must define the `jenkins-agent-ssh-key`
credential used by every configured SSH agent.

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
