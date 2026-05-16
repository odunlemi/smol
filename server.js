import "dotenv/config";
import express from "express";
import db from "./db.js";
import { cache } from "./cache.js";
import { writeBuffer } from "./writeBuffer.js";
import linksRouter from "./routes/links.js";
import { env } from "./config.js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

app.set("trust proxy", 1);
app.use(express.json());

/* CORS — needed for cross-origin callers (e.g. GitHub Pages → Vercel) */
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

/* API */
app.use("/api/links", linksRouter);

/* Static — serve site/ at root so / serves index.html, /style.css, etc. */
app.use(express.static(join(__dirname, "site")));

/* Redirect — hot path: cache-first, then DB fallback
   Must come AFTER static so file routes win over slug lookup */
app.get("/:slug", async (req, res) => {
  const { slug } = req.params;

  let link = cache.get(slug);

  if (!link) {
    const result = await db.execute({
      sql: "SELECT * FROM links WHERE slug = ?",
      args: [slug],
    });
    link = result.rows[0] ?? null;
    if (link) cache.set(slug, link);
  }

  if (!link) {
    /* Try to serve a custom 404 page; fall back to JSON if the file is missing */
    return res
      .status(404)
      .sendFile(join(__dirname, "site", "404.html"), (err) => {
        if (err) res.status(404).json({ error: "Link not found." });
      });
  }

  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    cache.delete(slug);
    return res.status(404).json({ error: "Link has expired." });
  }

  /* Redirect to the warning page — /redirect.html now that static is at root */
  const dest = encodeURIComponent(link.original_url);
  return res.redirect(302, `/redirect.html?dest=${dest}`);
});

/* 404 catch-all */
app.use((req, res) => {
  res.status(404).json({ error: "Not found." });
});

/* Graceful shutdown */
function shutdown(signal) {
  console.log(`\n[smol] ${signal} — flushing writes and closing..`);
  writeBuffer.flush().finally(() => process.exit(0));
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

app.listen(env.PORT, () => {
  console.log(`[smol] Running on ${env.BASE_URL}`);
});
