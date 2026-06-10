"""The `secrets` subcommand: render the gitignored secrets/ set with jinja2."""

from __future__ import annotations

import argparse
import os
import secrets
import sys
from pathlib import Path

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from jinja2 import Environment

from . import SSH_COMMENT, write_secret

# jinja2 renders every generated secret file. ${...} is JCasC interpolation,
# not jinja syntax, so it passes through to the output untouched.
JINJA = Environment(keep_trailing_newline=True, autoescape=False)

JENKINS_ENV_TMPL = JINJA.from_string(
    "JENKINS_UKSODEV_PASSWORD={{ uksodev_password }}\n"
    "JENKINS_ADMIN_PASSWORD={{ admin_password }}\n"
)
NEXUS_ENV_TMPL = JINJA.from_string(
    "NEXUS_ADMIN_USER={{ nexus_user }}\n"
    "NEXUS_ADMIN_PASSWORD={{ nexus_password }}\n"
    "NEXUS_REGISTRY={{ nexus_registry }}\n"
)
# Mirrors secrets.example/credentials.yaml; the README's manual `cp` flow keeps
# using that tracked template, this in-script one fills in the recovered key.
CREDENTIALS_TMPL = JINJA.from_string(
    "credentials:\n"
    "  system:\n"
    "    domainCredentials:\n"
    "      - credentials:\n"
    "          - basicSSHUserPrivateKey:\n"
    "              scope: SYSTEM\n"
    '              id: "jenkins-agent-ssh-key"\n'
    '              description: "SSH key for Docker Jenkins agents"\n'
    '              username: "jenkins"\n'
    "              privateKeySource:\n"
    "                directEntry:\n"
    "                  privateKey: |\n"
    "{{ private_key | trim | indent(width=20, first=True) }}\n"
    "          - usernamePassword:\n"
    "              scope: GLOBAL\n"
    '              id: "nexus-admin"\n'
    '              description: "Nexus admin for MetaBuilder image push"\n'
    '              username: "${NEXUS_ADMIN_USER}"\n'
    '              password: "${NEXUS_ADMIN_PASSWORD}"\n'
)


def load_or_make_key(import_path: Path | None) -> tuple[str, str]:
    """Return (openssh_private_key_text, "<openssh pubkey> jenkins-agent")."""
    if import_path is None:
        key = Ed25519PrivateKey.generate()
    else:
        try:
            key = serialization.load_ssh_private_key(
                import_path.read_bytes(), password=None
            )
        except (ValueError, FileNotFoundError) as exc:
            sys.exit(f"error: cannot load {import_path}: {exc}")

    priv = key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.OpenSSH,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode()
    pub = (
        key.public_key()
        .public_bytes(
            serialization.Encoding.OpenSSH, serialization.PublicFormat.OpenSSH
        )
        .decode()
    )
    return priv, f"{pub} {SSH_COMMENT}"


def cmd_secrets(a: argparse.Namespace) -> int:
    a.secrets_dir.mkdir(mode=0o700, exist_ok=True)
    os.chmod(a.secrets_dir, 0o700)

    files = ["jenkins.env", "nexus.env", "credentials.yaml"]
    clash = [f for f in files if (a.secrets_dir / f).exists()]
    if clash and not a.force:
        sys.exit(f"error: {', '.join(clash)} exist; pass --force to overwrite")

    uksodev_pw = a.uksodev_password or secrets.token_urlsafe(24)
    admin_pw = a.admin_password or secrets.token_urlsafe(24)
    priv, pub_line = load_or_make_key(a.import_ssh_key)

    write_secret(
        a.secrets_dir / "jenkins.env",
        JENKINS_ENV_TMPL.render(uksodev_password=uksodev_pw, admin_password=admin_pw),
    )
    write_secret(
        a.secrets_dir / "nexus.env",
        NEXUS_ENV_TMPL.render(
            nexus_user=a.nexus_user,
            nexus_password=a.nexus_password,
            nexus_registry=a.nexus_registry,
        ),
    )
    write_secret(
        a.secrets_dir / "credentials.yaml",
        CREDENTIALS_TMPL.render(private_key=priv),
    )

    print(f"wrote {a.secrets_dir}/{{jenkins.env,nexus.env,credentials.yaml}} (0600)")
    if a.show or not a.uksodev_password:
        print(f"JENKINS_UKSODEV_PASSWORD: {uksodev_pw}  (save this)")
    if a.show or not a.admin_password:
        print(f"JENKINS_ADMIN_PASSWORD:   {admin_pw}  (save this)")
    if a.import_ssh_key is None:
        print("\nNEW agent key minted — set JENKINS_AGENT_SSH_PUBKEY in")
        print(f"docker-compose.yml to:\n  {pub_line}\nthen rebuild all agents.")
    return 0
