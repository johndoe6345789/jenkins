-- Record the schema version (idempotent).
INSERT INTO vault_meta (key, value) VALUES ('schema_version', '1')
    ON CONFLICT (key) DO NOTHING
