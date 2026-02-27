import { env } from "../config.js";

/* In-memory store
    IP : {count, windowStart} */
const ipWindows = new Map();

export function rateLimit(req, res, next) {
  const ip = req.ip;
  const now = Date.now();
  const window = ipWindows.get(ip);

  if (!window || now - window.windowStart > env.RATE_LIMIT_WINDOW_MS) {
    // Fresh window
    ipWindows.set(ip, { count: 1, windowStart: now });
    return next();
  }

  if (window.count >= env.RATE_LIMIT_MAX) {
    const retryAfterSec = Math.ceil(
      (env.RATE_LIMIT_WINDOW_MS - (now - window.windowStart)) / 1000,
    );
    res.set("Retry-After", retryAfterSec);
    return res
      .status(429)
      .json({ error: "Rate limit exceeded. Try again later." });
  }

  window.count++;
  next();
}
