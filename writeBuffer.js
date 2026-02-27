import db from "./db.js";
import { env } from "./config.js";

/* Pending inserts waiting to be flushed */
const buffer = [];

const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO LINKS (slug, original_url, creator_ip, created_at, expires_at)
    VALUES (@slug, @original_url, @creator_ip, @created_at, @expires_at)
`);

const flushMany = db.transaction((rows) => {
  for (const row of rows) insertStmt.run(row);
});

function flush() {
  if (buffer.length === 0) return;
  const rows = buffer.splice(0, buffer.length);
  try {
    flushMany(rows);
  } catch (err) {
    console.log("[writeBuffer] flush error:", err.message);
  }
}

/* Start the flush interval as soon as thus module is imported */
setInterval(flush, env.WRITE_BUFFER_FLUSH_MS).unref();

export const writeBuffer = {
  // Queue link for insertion
  add(link) {
    buffer.push(link);
  },

  // Useful in tests or on graceful shutdown
  flush,
};
