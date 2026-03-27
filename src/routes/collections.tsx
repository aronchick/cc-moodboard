import { Hono } from "hono";
import { CollectionList, CollectionDetail } from "../views/collection";
import { SynthesizedView } from "../views/synthesized";
import {
  listCollections,
  getCollection,
  createCollection,
  deleteCollection,
  addToCollection,
  removeFromCollection,
  getCollectionEntries,
  listEntries,
  getLatestBoard,
  saveSynthesizedBoard,
} from "../db/queries";
import type { Entry } from "../db/queries";

const app = new Hono();

// List collections
app.get("/collections", (c) => {
  const collections = listCollections();
  return c.html(<CollectionList collections={collections} />);
});

// View collection
app.get("/collections/:id", (c) => {
  const id = parseInt(c.req.param("id"));
  const collection = getCollection(id);
  if (!collection) return c.redirect("/collections");

  const entries = getCollectionEntries(id);
  const allEntries = listEntries({ limit: 200 });

  return c.html(
    <CollectionDetail collection={collection} entries={entries} allEntries={allEntries} />,
  );
});

// Synthesize view
app.get("/collections/:id/synthesize", (c) => {
  const id = parseInt(c.req.param("id"));
  const collection = getCollection(id);
  if (!collection) return c.redirect("/collections");

  const entries = getCollectionEntries(id);

  // Generate the synthesis
  const board = synthesizeCollection(collection.name, entries);
  const saved = saveSynthesizedBoard(id, board.markdown, JSON.stringify(board.brief));

  return c.html(<SynthesizedView collection={collection} board={saved} />);
});

// Export markdown
app.get("/api/collections/:id/synthesize/markdown", (c) => {
  const id = parseInt(c.req.param("id"));
  const board = getLatestBoard(id);
  if (!board) return c.text("No synthesized board found", 404);
  c.header("Content-Type", "text/markdown");
  c.header("Content-Disposition", `attachment; filename="moodboard.md"`);
  return c.text(board.board_markdown);
});

// Export design brief
app.get("/api/collections/:id/synthesize/brief", (c) => {
  const id = parseInt(c.req.param("id"));
  const board = getLatestBoard(id);
  if (!board?.design_brief) return c.text("No design brief found", 404);
  c.header("Content-Type", "application/json");
  c.header("Content-Disposition", `attachment; filename="design-brief.json"`);
  return c.text(board.design_brief);
});

// Create collection
app.post("/api/collections", async (c) => {
  const formData = await c.req.formData();
  const name = (formData.get("name") as string)?.trim();
  const description = (formData.get("description") as string)?.trim();
  if (!name) return c.redirect("/collections");
  createCollection(name, description || undefined);
  return c.redirect("/collections");
});

// Delete collection
app.post("/api/collections/:id/delete", (c) => {
  const id = parseInt(c.req.param("id"));
  deleteCollection(id);
  return c.redirect("/collections");
});

// Add entry to collection
app.post("/api/collections/:id/entries", async (c) => {
  const id = parseInt(c.req.param("id"));
  const formData = await c.req.formData();
  const entryId = parseInt(formData.get("entry_id") as string);
  if (entryId) addToCollection(id, entryId);
  return c.redirect(`/collections/${id}`);
});

// Remove entry from collection
app.post("/api/collections/:collId/entries/:entryId/remove", (c) => {
  const collId = parseInt(c.req.param("collId"));
  const entryId = parseInt(c.req.param("entryId"));
  removeFromCollection(collId, entryId);
  return c.redirect(`/collections/${collId}`);
});

// --- Synthesis logic ---

function synthesizeCollection(name: string, entries: Entry[]) {
  const colors = entries.filter((e) => e.type === "color");
  const urls = entries.filter((e) => e.type === "url");
  const images = entries.filter((e) => e.type === "image");
  const fonts = entries.filter((e) => e.type === "font");
  const notes = entries.filter((e) => e.type === "note");

  // Extract all colors from metadata too
  const allColors: string[] = [...colors.map((c) => c.content)];
  for (const entry of [...urls, ...images]) {
    const meta = JSON.parse(entry.metadata || "{}");
    if (meta.extractedColors) allColors.push(...meta.extractedColors);
  }
  const uniqueColors = [...new Set(allColors)].slice(0, 12);

  // Extract fonts
  const allFonts: string[] = [...fonts.map((f) => f.content)];
  for (const entry of urls) {
    const meta = JSON.parse(entry.metadata || "{}");
    if (meta.extractedFonts) allFonts.push(...meta.extractedFonts);
  }
  const uniqueFonts = [...new Set(allFonts)].slice(0, 8);

  const markdown = `# Mood Board: ${name}

Generated: ${new Date().toISOString().split("T")[0]}

## Visual Thesis

${notes.length > 0 ? notes.map((n) => n.content).join(". ") + "." : "A curated collection of design inspiration."}

## Color Palette

${uniqueColors.length > 0 ? uniqueColors.map((c) => `- \`${c}\``).join("\n") : "No colors extracted yet."}

## Typography Direction

${uniqueFonts.length > 0 ? uniqueFonts.map((f) => `- ${f}`).join("\n") : "No font preferences collected yet."}

## Reference Sites

${urls.length > 0 ? urls.map((u) => `- [${u.title ?? u.content}](${u.content})${u.description ? " — " + u.description : ""}`).join("\n") : "No reference URLs yet."}

## Visual References

${images.length > 0 ? `${images.length} images collected.` : "No images yet."}

## Notes

${notes.length > 0 ? notes.map((n) => `- ${n.content}`).join("\n") : "No notes yet."}

## Raw Entries

Total: ${entries.length} entries (${colors.length} colors, ${urls.length} URLs, ${images.length} images, ${fonts.length} fonts, ${notes.length} notes)
`;

  const brief = {
    name,
    generatedAt: new Date().toISOString(),
    colorPalette: uniqueColors,
    typography: uniqueFonts,
    references: urls.map((u) => ({ title: u.title, url: u.content, description: u.description })),
    notes: notes.map((n) => n.content),
    entryCount: entries.length,
  };

  return { markdown, brief };
}

export default app;
