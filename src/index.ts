import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { logger } from "hono/logger";
import { join } from "path";

import { initDb, getAssetsDir } from "./db/schema";
import dashboard from "./routes/dashboard.tsx";
import entries from "./routes/entries.tsx";
import collections from "./routes/collections.tsx";
import api from "./routes/api";
import brief from "./routes/brief";


// Init database
initDb();

const app = new Hono();

// Middleware
app.use("*", logger());

// Static files
app.use("/styles.css", serveStatic({ root: "./public" }));
app.use("/app.js", serveStatic({ root: "./public" }));
app.use("/companion/*", serveStatic({ root: "./public" }));

// Serve assets from the moodboard assets directory
app.get("/assets/:filename", (c) => {
  const filename = c.req.param("filename");
  // Sanitize: only allow alphanumeric, dash, underscore, dot
  if (!/^[\w\-\.]+$/.test(filename)) return c.text("Bad request", 400);
  const filePath = join(getAssetsDir(), filename);
  return new Response(Bun.file(filePath));
});

// llms.txt — machine-readable site description for LLMs (before route mounts)
app.get("/llms.txt", (c) => {
  c.header("Content-Type", "text/plain; charset=utf-8");
  return c.body(`# cc-moodboard

> Design inspiration second brain. Collect URLs, images, colors, fonts, and notes into a curated moodboard. Organize entries into collections, synthesize design briefs, and capture taste reactions.

## Web UI

- [Dashboard](/) — Browse, search, filter, and star moodboard entries
- [Add Entry](/add) — Add individual entries or batch-import via form
- [Collections](/collections) — Organize entries into themed collections
- [Design Brief](/brief) — Full design taste brief (markdown); add ?format=json for JSON
- [Companion UI](/companion/) — Live-updating brainstorming companion

## API (JSON) — Base path: /api/v1

### Entries
- [List entries](/api/v1/entries) — GET; query params: type, tag, search, limit, offset
- [Get entry](/api/v1/entries/:id) — GET
- [Create entry](/api/v1/entries) — POST JSON {content, type?, source?, tags?[]}
- [Delete entry](/api/v1/entries/:id) — DELETE
- [Toggle star](/api/v1/entries/:id/star) — POST
- [Get stats](/api/v1/stats) — GET; returns total, byType, collections, starred counts
- [Get tags](/api/v1/tags) — GET; returns all tags with counts

### Collections
- [List collections](/api/v1/collections) — GET
- [Collection entries](/api/v1/collections/:id/entries) — GET
- [Synthesized board](/api/v1/collections/:id/board) — GET; latest generated moodboard
- [Export markdown](/api/collections/:id/synthesize/markdown) — GET; download as .md
- [Export brief JSON](/api/collections/:id/synthesize/brief) — GET; download as .json

### Taste Reactions
- [Record reaction](/api/v1/reactions) — POST JSON {site, element, reaction: like|dislike|neutral}
- [Add comment](/api/v1/reactions/comment) — POST JSON {site, comment}
- [List reactions](/api/v1/reactions) — GET

### Design Brief
- [Full brief](/brief) — GET; returns the design taste brief as markdown
- [JSON brief](/brief?format=json) — GET; returns structured sections as JSON
- [Filter sections](/brief?only=colors,typography) — GET; comma-separated section names
- [Context mode](/brief?context=tools) — GET; promotes a context section to the top (tools|marketing|docs|editorial)

### System
- [Health check](/health) — GET; returns {status: "ok"}
- [llms.txt](/llms.txt) — This file

## Entry Types

Entries are auto-detected from content:
- **url** — Web pages (metadata, colors, fonts auto-extracted)
- **image** — Uploaded images or image URLs
- **color** — Hex (#ff0000), RGB, or HSL color values
- **font** — Font names (Inter, Roboto, Figtree, Geist, etc.)
- **note** — Free-text notes and observations
- **screenshot** — Screenshot captures
`);
});

// Health check
app.get("/health", (c) => c.json({ status: "ok", version: "0.1.0" }));

// Routes
app.route("/", dashboard);
app.route("/", entries);
app.route("/", collections);
app.route("/", api);
app.route("/", brief);

const PORT = parseInt(process.env.PORT ?? "3100");

console.log(`cc-moodboard starting on http://localhost:${PORT}`);


export default {
  port: PORT,
  fetch: app.fetch,
};
