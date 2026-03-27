import { Hono } from "hono";
import { AddForm } from "../views/add-form";
import { EntryCard } from "../views/entry-card";
import {
  insertEntry,
  getEntry,
  deleteEntry,
  toggleStar,
  updateEntry,
} from "../db/queries";
import { detectContentType, extractUrlsFromText, extractColorsFromText } from "../ingest/detect";
import { ingestUrl } from "../ingest/url";
import { ingestImageFromBuffer } from "../ingest/image";

const app = new Hono();

// Show add form
app.get("/add", (c) => {
  const message = c.req.query("message");
  const error = c.req.query("error");
  return c.html(<AddForm message={message} error={error} />);
});

// Add single entry
app.post("/api/entries", async (c) => {
  const formData = await c.req.formData();
  const content = formData.get("content") as string | null;
  const image = formData.get("image") as File | null;
  const tagsStr = formData.get("tags") as string | null;
  const description = formData.get("description") as string | null;

  const tags = tagsStr
    ? tagsStr.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  try {
    if (image && image.size > 0) {
      const buffer = Buffer.from(await image.arrayBuffer());
      const entry = ingestImageFromBuffer(buffer, image.name);
      if (tags.length) updateEntry(entry.id, { tags: JSON.stringify(tags) });
      if (description) updateEntry(entry.id, { description });
      return c.redirect(`/add?message=Added image: ${image.name}`);
    }

    if (!content?.trim()) {
      return c.redirect("/add?error=Please provide content or an image");
    }

    const detected = detectContentType(content);

    if (detected.type === "url") {
      const entry = await ingestUrl(content);
      if (tags.length) updateEntry(entry.id, { tags: JSON.stringify(tags) });
      if (description) updateEntry(entry.id, { description });
      return c.redirect(`/add?message=Added URL: ${entry.title}`);
    }

    const entry = insertEntry({
      type: detected.type,
      content: detected.content,
      title: detected.title,
      tags,
      description: description || undefined,
      metadata: detected.metadata,
    });

    return c.redirect(`/add?message=Added ${detected.type}: ${entry.title ?? entry.content}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return c.redirect(`/add?error=${encodeURIComponent(msg)}`);
  }
});

// Batch add
app.post("/api/entries/batch", async (c) => {
  const formData = await c.req.formData();
  const items = (formData.get("items") as string ?? "").split("\n").filter((l) => l.trim());

  let added = 0;
  for (const line of items) {
    const detected = detectContentType(line);
    if (detected.type === "url") {
      await ingestUrl(line);
    } else {
      insertEntry({
        type: detected.type,
        content: detected.content,
        title: detected.title,
        metadata: detected.metadata,
      });
    }
    added++;
  }

  return c.redirect(`/add?message=Added ${added} entries`);
});

// Toggle star (HTMX)
app.post("/api/entries/:id/star", (c) => {
  const id = parseInt(c.req.param("id"));
  toggleStar(id);
  const entry = getEntry(id);
  if (!entry) return c.text("", 404);
  return c.html(<EntryCard entry={entry} />);
});

// Delete entry (HTMX)
app.delete("/api/entries/:id", (c) => {
  const id = parseInt(c.req.param("id"));
  deleteEntry(id);
  return c.text("");
});

// Update entry tags
app.post("/api/entries/:id/tags", async (c) => {
  const id = parseInt(c.req.param("id"));
  const { tags } = await c.req.json<{ tags: string[] }>();
  updateEntry(id, { tags: JSON.stringify(tags) });
  return c.json({ ok: true });
});

export default app;
