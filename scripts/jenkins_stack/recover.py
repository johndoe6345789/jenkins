"""The `recover-key` subcommand: decrypt the agent SSH key + Nexus password
out of the persisted jenkins_home volume (post-2014 Jenkins secret format)."""

from __future__ import annotations

import argparse
import base64
import hashlib
import re
import subprocess
import sys
import tempfile
from pathlib import Path

from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

from . import HOME_VOLUME, JENKINS_MAGIC, write_secret


def _decrypt_store() -> tuple[str | None, str | None]:
    """Pull the agent SSH key + nexus-admin password out of the persisted
    jenkins_home volume. Returns (private_key_text_or_None, nexus_pw_or_None)."""
    with tempfile.TemporaryDirectory() as td:
        rc = subprocess.run(
            [
                "docker", "run", "--rm",
                "-v", f"{HOME_VOLUME}:/j", "-v", f"{td}:/out",
                "alpine", "sh", "-c",
                "cp /j/secrets/master.key /j/secrets/hudson.util.Secret "
                "/j/credentials.xml /out/ && chmod -R a+r /out",
            ],
            capture_output=True, text=True,
        )
        if rc.returncode != 0:
            sys.exit(
                f"error: could not read volume {HOME_VOLUME} "
                f"(is it present?): {rc.stderr.strip()}"
            )
        d = Path(td)
        master = (d / "master.key").read_bytes()
        hudson_enc = (d / "hudson.util.Secret").read_bytes()
        xml = (d / "credentials.xml").read_text()

    derived = hashlib.sha256(master).digest()[:16]
    dec = Cipher(algorithms.AES(derived), modes.ECB()).decryptor()
    hudson = dec.update(hudson_enc) + dec.finalize()
    if JENKINS_MAGIC not in hudson:
        sys.exit("error: master.key/hudson.util.Secret did not validate")
    conf_key = hudson[:16]

    def dv(enc: str) -> str:
        enc = enc.strip().removeprefix("{").removesuffix("}")
        p = base64.b64decode(enc)
        if p and p[0] == 1:  # version | ivlen(4) | datalen(4) | iv | data
            il = int.from_bytes(p[1:5], "big")
            dl = int.from_bytes(p[5:9], "big")
            iv, data = p[9 : 9 + il], p[9 + il : 9 + il + dl]
            c = Cipher(algorithms.AES(conf_key), modes.CBC(iv)).decryptor()
            out = c.update(data) + c.finalize()
            return out[: -out[-1]].decode("utf-8", "replace")
        c = Cipher(algorithms.AES(conf_key), modes.ECB()).decryptor()
        return (c.update(p) + c.finalize()).split(JENKINS_MAGIC)[0].decode(
            "utf-8", "replace"
        )

    priv = None
    km = re.search(r"<privateKey>(.*?)</privateKey>", xml, re.S)
    if km:
        priv = dv(km.group(1))

    nexus_pw = None
    for blk in re.findall(
        r"<com\.cloudbees\.plugins\.credentials\.impl\."
        r"UsernamePasswordCredentialsImpl>.*?</com\.cloudbees\.plugins\."
        r"credentials\.impl\.UsernamePasswordCredentialsImpl>",
        xml, re.S,
    ):
        if "nexus-admin" in blk:
            pm = re.search(r"<password>(.*?)</password>", blk, re.S)
            if pm:
                nexus_pw = dv(pm.group(1))
    return priv, nexus_pw


def cmd_recover_key(a: argparse.Namespace) -> int:
    priv, nexus_pw = _decrypt_store()
    if a.print_nexus_only:
        if not nexus_pw:
            sys.exit("error: no nexus-admin credential in the persisted store")
        print(nexus_pw)
        return 0
    if not priv or "PRIVATE KEY" not in priv:
        sys.exit("error: no agent SSH key recovered from the persisted store")
    a.out.parent.mkdir(parents=True, exist_ok=True)
    write_secret(a.out, priv)
    print(f"recovered agent SSH key -> {a.out} (0600)")
    if nexus_pw:
        print(f"recovered nexus-admin password: {nexus_pw}")
    return 0
