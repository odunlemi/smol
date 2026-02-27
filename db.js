import Database from "better-sqlite3";
import { env } from "./config.js";

const db = new Database(env.DB_PATH);

db.exec(`
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
