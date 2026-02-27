import db from "./db.js";
import { env } from "./config.js";

/* Pending inserts waiting to be flushed */
const buffer = [];

async function flush() {
  if (buffer.length === 0) return;
  const rows = buffer.splice(0, buffer.length);
  
  try {
  // Batch all pending inserts in a single round-trip
  await db.batch(
    rows.map((row) => ({
      sql: "INSERT OR IGNORE INTO links (slug, original_url, creator_ip, created_at, expires_at) VALUES (?, ?, ?, ?, ?)",
      args: [row.slug, row.original_url, row.creator_ip, row.created_at, row.expires_at],
    }))
  );} catch (err) {
  console.error("[writeBuffer] flush error:", err.message);}
}

setInterval(flush, env.WRITE_BUFFER_FLUSH_MS).unref();

export const writeBuffer = {
  add(link) {
    buffer.push(link);
  },
  flush,
};
