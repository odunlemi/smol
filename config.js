import "dotenv/config";

export const env = {
  PORT: parseInt(process.env.PORT) || 3000,
  BASE_URL: process.env.BASE_URL || "http://localhost:3000",
  TURSO_URL: process.env.TURSO_URL || "file:./smol.db",
  TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN || "",
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX) || 5,
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 3_600_000,
  LINK_TTL_MS: parseInt(process.env.LINK_TTL_MS) || 15_552_000_000,
  WRITE_BUFFER_FLUSH_MS: parseInt(process.env.WRITE_BUFFER_FLUSH_MS) || 300,
};
