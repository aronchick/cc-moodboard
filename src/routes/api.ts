import { Hono } from "hono";
import {
  listEntries,
  getEntry,
  insertEntry,
  deleteEntry,
  toggleStar,
  getStats,
  getAllTags,
  listCollections,
  getCollectionEntries,
  getLatestBoard,
} from "../db/queries";
import { detectContentType } from "../ingest/detect";
import { ingestUrl } from "../ingest/url";

const app = new Hono();

// JSON API for programmatic access / extensions

app.get("/api/v1/entries", (c) => {
  const type = c.req.query("type");
  const tag = c.req.query("tag");
  const search = c.req.query("search");
  const limit = parseInt(c.req.query("limit") ?? "50");
  const offset = parseInt(c.req.query("offset") ?? "0");

  const entries = listEntries({ type, tag, search, limit, offset });
  return c.json({ entries, count: entries.length });
});

app.get("/api/v1/entries/:id", (c) => {
  const id = parseInt(c.req.param("id"));
  const entry = getEntry(id);
  if (!entry) return c.json({ error: "Not found" }, 404);
  return c.json(entry);
});

app.post("/api/v1/entries", async (c) => {
  const body = await c.req.json<{
    content: string;
    type?: string;
    source?: string;
    source_ref?: string;
    title?: string;
    description?: string;
    tags?: string[];
  }>();

  const detected = detectContentType(body.content);

  if (detected.type === "url") {
    const entry = await ingestUrl(body.content, body.source, body.source_ref);
    return c.json(entry, 201);
  }

  const entry = insertEntry({
    type: (body.type as any) ?? detected.type,
    content: detected.content,
    title: body.title ?? detected.title,
    source: body.source,
    source_ref: body.source_ref,
    description: body.description,
    tags: body.tags,
    metadata: detected.metadata,
  });
  return c.json(entry, 201);
});

app.delete("/api/v1/entries/:id", (c) => {
  const id = parseInt(c.req.param("id"));
  deleteEntry(id);
  return c.json({ ok: true });
});

app.post("/api/v1/entries/:id/star", (c) => {
  const id = parseInt(c.req.param("id"));
  const starred = toggleStar(id);
  return c.json({ starred });
});

app.get("/api/v1/stats", (c) => {
  return c.json(getStats());
});

app.get("/api/v1/tags", (c) => {
  return c.json(getAllTags());
});

app.get("/api/v1/collections", (c) => {
  return c.json(listCollections());
});

app.get("/api/v1/collections/:id/entries", (c) => {
  const id = parseInt(c.req.param("id"));
  return c.json(getCollectionEntries(id));
});

app.get("/api/v1/collections/:id/board", (c) => {
  const id = parseInt(c.req.param("id"));
  const board = getLatestBoard(id);
  if (!board) return c.json({ error: "No synthesized board" }, 404);
  return c.json(board);
});

export default app;
