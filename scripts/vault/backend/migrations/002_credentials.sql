-- Sealed credentials. ciphertext/nonce are base64 text of the AES-256-GCM
-- output (body||tag); the master key is derived per session and never stored.
CREATE TABLE IF NOT EXISTS credentials (
    name       TEXT PRIMARY KEY,
    badge      TEXT,
    rotate_url TEXT,
    ciphertext TEXT NOT NULL,
    nonce      TEXT NOT NULL,
    updated_at TEXT NOT NULL
)
