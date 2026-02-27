import { createClient } from "@libsql/client";
import { env } from "./config.js";

const db = createClient({
    url: env.TURSO_URL,
    authToken: env.TURSO_AUTH_TOKEN,
});

/* Create table and indexes on startup */
await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS links (
    slug TEXT PRIMARY KEY,
    original_url TEXT NOT NULL,
    creator_ip TEXT NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_links_creator_ip ON links(creator_ip);
    CREATE INDEX IF NOT EXISTS idx_links_expires_at ON links(expires_at);
    `);

export default db;
