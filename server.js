import "dotenv/config";
import express from "express";
import db from "./db.js";
import { cache } from "./cache.js";
import { writeBuffer } from "./writeBuffer.js";
import linksRouter from "./routes/links.js";
import { env } from "./config.js";

const app = express();

app.set("trust proxy", 1);
app.use(express.json());

/* Api for the ui */
app.use("/api/links", linksRouter);

/* Redirect 
Hot path - cache-first, then db fallback */
app.get("/:slug", (req, res) => {
  const { slug } = req.params;

  let link = cache.get(slug);

  if (!link) {
    link = db.prepare("SELECT * FROM links where slug = ?").get(slug);
    if (link) cache.set(slug, link);
  }

  if (!link) {
    return res.status(404).json({ error: "Link not found." });
  }

  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    cache.delete(slug);
    return res.status(404).json({ error: "Link has expired." });
  }

  return res.redirect(302, link.original_url);
});

/* 404 catch-all */
app.use((req, res) => {
  res.status(404).json({ error: "Not found." });
});

/* Graceful shutdown */
function shutdown(signal) {
  console.log(`\n[smol.dev] ${signal} received. flushing writes and closing..`);
  writeBuffer.flush();
  db.close();
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

/* Start */
app.listen(env.PORT, () => {
  console.log(`[smol.dev] Running on ${env.BASE_URL}`);
});
