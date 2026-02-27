# smol.dev

A simple, fast URL shortening service.

## Setup

```bash
npm install
cp .env.example .env   # edit as needed
npm run dev
```

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

- Returns the same shape as the creation response (no redirect)

## Status codes

| Code | Meaning                                |
| ---- | -------------------------------------- |
| 201  | Link created                           |
| 302  | Redirect                               |
| 400  | Bad request (invalid URL, slug format) |
| 404  | Not found or expired                   |
| 409  | Custom slug already taken              |
| 429  | Rate limit hit (5 creations/IP/hour)   |

## Architecture notes

- **In-memory cache** — slugs are cached in a `Map` on creation and on first DB read, keeping redirects fast
- **Write buffer** — inserts are batched and flushed to SQLite every 300ms to handle traffic spikes
- **Graceful shutdown** — `SIGINT`/`SIGTERM` flush the buffer and close the DB cleanly
