# Reboot recovery

Docker starts at boot and the persistent services use the
`unless-stopped` restart policy. This covers:

- `captain-cloudflare-tunnel`
- `vault-db`
- `vault-backend`
- `vault-frontend`

The Vault Compose stack also gates each layer on a real health check.
The backend waits for PostgreSQL before creating Drogon's connection pool,
so simultaneous container startup cannot permanently poison the pool.

## Verify

```bash
docker inspect --format \
  '{{.Name}} {{.HostConfig.RestartPolicy.Name}}' \
  captain-cloudflare-tunnel vault-db vault-backend vault-frontend
docker compose -f scripts/vault/docker-compose.yml ps
curl -fsS https://vault.wardcrew.com/api/health
```

## Optional systemd supervision

Docker restart policies are sufficient for normal reboots. The units in
`systemd/` add host-level startup verification and can be installed by a
sudo-capable administrator:

```bash
sudo install -m 0644 systemd/wardcrew-vault.service \
  systemd/wardcrew-cloudflare.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now wardcrew-vault wardcrew-cloudflare
```
