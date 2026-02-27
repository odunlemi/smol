# smol.dev

A simple, fast URL shortening service. Built with Node.js, Express, and Turso.

## Local setup

```bash
npm install
cp .env.example .env
npm run dev
```

No Turso account needed locally. The default config writes to a local `smol.db` file.

## Environment variables

| Variable | Description | Default |
|---|---|---|
| `PORT` | Port to listen on | `3000` |
| `BASE_URL` | Base URL for generated short links | `http://localhost:3000` |
| `TURSO_URL` | Turso database URL | `file:./smol.db` |
| `TURSO_AUTH_TOKEN` | Turso auth token (prod only) | `` |
| `RATE_LIMIT_MAX` | Max link creations per IP per window | `5` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window in ms | `3600000` (1 hour) |
| `LINK_TTL_MS` | Link expiry duration in ms | `15552000000` (6 months) |
| `WRITE_BUFFER_FLUSH_MS` | Write buffer flush interval in ms | `300` |

## API

### Create a short link
```
POST /api/links
Content-Type: application/json

{ "url": "https://very-long-url.com/...", "custom_slug": "my-promo" }
```
- `custom_slug` is optional. Omit for a random 8-char slug.
- Returns `201` with `{ slug, short_url, original_url, created_at, expires_at }`

### Redirect
```
GET /:slug
```
- Returns `302` to the original URL
- Returns `404` if not found or expired

### Link metadata
```
GET /api/links/:slug
```
- Returns the same shape as the creation response without redirecting

## Status codes

| Code | Meaning |
|---|---|
| 201 | Link created |
| 302 | Redirect |
| 400 | Bad request (invalid URL, slug format) |
| 404 | Not found or expired |
| 409 | Custom slug already taken |
| 429 | Rate limit hit (5 creations/IP/hour) |

## Deploying to Vercel

### 1. Create a Turso database

```bash
# Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

turso auth login --headless
turso db create smol-dev

# Copy these for the next step
turso db show smol-dev --url
turso db tokens create smol-dev
```

### 2. Deploy

```bash
npm i -g vercel
vercel
```

### 3. Add environment variables

```bash
vercel env add TURSO_URL          # paste turso db URL
vercel env add TURSO_AUTH_TOKEN   # paste token
vercel env add BASE_URL           # https://smol.dev
vercel env add RATE_LIMIT_MAX
vercel env add RATE_LIMIT_WINDOW_MS
vercel env add LINK_TTL_MS
vercel env add WRITE_BUFFER_FLUSH_MS
```

### 4. Redeploy with env vars active

```bash
vercel --prod
```

## Architecture

- **In-memory cache** — slugs are cached in a `Map` on creation and on first DB read, keeping redirects fast without hitting the DB on every request
- **Write buffer** — inserts are batched and flushed to the DB every 300ms to handle traffic spikes without overwhelming the connection
- **Turso/libsql** — SQLite-compatible hosted DB with a pure JS driver, no native compilation required
- **Graceful shutdown** — `SIGINT`/`SIGTERM` flush the buffer before closing