import { Router } from "express";
import { nanoid } from "nanoid";
import db from "../db.js";
import { cache } from "../cache.js";
import { writeBuffer } from "../writeBuffer.js";
import { rateLimit } from "../middleware/rateLimit.js";
import { env } from "../config.js";

const router = Router();

/* Helpers */
const SLUG_RE = /^[A-Za-z0-9_-]{1,50}$/;

function isValidUrl(str) {
  try {
    const { protocol } = new URL(str);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

function isExpired(link) {
  return link.expires_at && new Date(link.expires_at) < new Date();
}

function buildLink(slug, original_url, ip) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + env.LINK_TTL_MS);
  return {
    slug,
    original_url,
    creator_ip: ip,
    created_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
  };
}

async function slugExists(slug) {
  const result = await db.execute({
    sql: "SELECT slug FROM links WHERE slug = ?",
    args: [slug],
  });
  return result.rows.length > 0;
}

/* POST /api/links  
For the ui */
router.post("/", rateLimit, async (req, res) => {
  const { url, custom_slug } = req.body;

  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "url is required." });
  }

  if (Buffer.byteLength(url, "utf8") > 3072) {
    return res.status(400).json({ error: "URL exceeds 3kb limit." }); // Extra functional requirement
  }

  if (!isValidUrl(url)) {
    return res
      .status(400)
      .json({ error: "Invalid URL. Must start with http:// or https://." });
  }

  let slug = custom_slug?.trim();

  if (slug) {
    if (Buffer.byteLength(slug, "utf8") > 307) {
      return res
        .status(400)
        .json({ error: "Custom slug exceeds 0.3kb limit." });
    }

    if (!SLUG_RE.test(slug)) {
      return res
        .status(400)
        .json({ error: "Slug may only contain letters, numbers, - and _." });
    }

    if (await(slugExists(slug))) {
      return res
        .status(409)
        .json({ error: "That custom slug is already taken." });
    }
  } else {
    // Generate a new random slug
    let attempts = 0;
    do {
      slug = nanoid(8);
      attempts++;
      if (attempts > 10) {
        return res
          .status(500)
          .json({ error: "Could not generate a unique slug. Try again." });
      }
    } while (await slugExists(slug));
  }

  const link = buildLink(slug, url, req.ip);

  /* Warm the cache immediately so the redirects work before the buffer flushes */
  cache.set(slug, link);
  writeBuffer.add(link);

  return res.status(201).json({
    slug: link.slug,
    short_url: `${env.BASE_URL}/${link.slug}`,
    original_url: link.original_url,
    created_at: link.created_at,
    expires_at: link.expires_at,
  });
});

/* GET /api/links/:slug 
    Metadata */
router.get("/:slug", async (req, res) => {
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
    return res.status(404).json({ error: "Link not found." });
  }

  if (isExpired(link)) {
    cache.delete(slug);
    return res.status(404).json({ error: "Link has expired." });
  }

  return res.json({
    slug: link.slug,
    short_url: `${env.BASE_URL}/${link.slug}`,
    original_url: link.original_url,
    created_at: link.created_at,
    expires_at: link.expires_at,
  });
});

export default router;
