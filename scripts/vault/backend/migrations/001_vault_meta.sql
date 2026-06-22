-- Key/value metadata (KDF salt, schema version). One statement per file:
-- migrations run via Drogon execSqlSync, whose no-parameter path uses the
-- extended protocol and rejects multiple statements in one call.
CREATE TABLE IF NOT EXISTS vault_meta (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
)
