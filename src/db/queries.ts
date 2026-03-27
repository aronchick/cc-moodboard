import { Database } from "bun:sqlite";
import { getDb } from "./schema";

export type EntryType = "url" | "image" | "color" | "font" | "note" | "screenshot";

export interface Entry {
  id: number;
  type: EntryType;
  source: string;
  source_ref: string | null;
  title: string | null;
  content: string;
  description: string | null;
  asset_path: string | null;
  thumbnail_path: string | null;
  tags: string;
  metadata: string;
  starred: number;
  created_at: string;
  updated_at: string;
}

export interface Collection {
  id: number;
  name: string;
  description: string | null;
  cover_entry_id: number | null;
  created_at: string;
  entry_count?: number;
}

export interface SynthesizedBoard {
  id: number;
  collection_id: number;
  board_markdown: string;
  design_brief: string | null;
  created_at: string;
}

let _db: Database | null = null;

function db(): Database {
  if (!_db) _db = getDb();
  return _db;
}

// --- Entries ---

export function insertEntry(entry: {
  type: EntryType;
  source?: string;
  source_ref?: string;
  title?: string;
  content: string;
  description?: string;
  asset_path?: string;
  thumbnail_path?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}): Entry {
  const stmt = db().prepare(`
    INSERT INTO entries (type, source, source_ref, title, content, description, asset_path, thumbnail_path, tags, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    entry.type,
    entry.source ?? "manual",
    entry.source_ref ?? null,
    entry.title ?? null,
    entry.content,
    entry.description ?? null,
    entry.asset_path ?? null,
    entry.thumbnail_path ?? null,
    JSON.stringify(entry.tags ?? []),
    JSON.stringify(entry.metadata ?? {}),
  );
  const id = db().query("SELECT last_insert_rowid() as id").get() as { id: number };
  return getEntry(id.id)!;
}

export function getEntry(id: number): Entry | null {
  return db().query("SELECT * FROM entries WHERE id = ?").get(id) as Entry | null;
}

export function listEntries(opts: {
  type?: string;
  tag?: string;
  starred?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
} = {}): Entry[] {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (opts.type) {
    conditions.push("e.type = ?");
    params.push(opts.type);
  }
  if (opts.tag) {
    conditions.push("e.tags LIKE ?");
    params.push(`%"${opts.tag}"%`);
  }
  if (opts.starred) {
    conditions.push("e.starred = 1");
  }

  if (opts.search) {
    // Use FTS5
    const ftsIds = db()
      .query("SELECT rowid FROM entries_fts WHERE entries_fts MATCH ? ORDER BY rank LIMIT 200")
      .all(opts.search) as { rowid: number }[];
    if (ftsIds.length === 0) return [];
    const idList = ftsIds.map((r) => r.rowid).join(",");
    conditions.push(`e.id IN (${idList})`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = opts.limit ?? 50;
  const offset = opts.offset ?? 0;

  return db()
    .query(`SELECT e.* FROM entries e ${where} ORDER BY e.created_at DESC LIMIT ? OFFSET ?`)
    .all(...params, limit, offset) as Entry[];
}

export function updateEntry(id: number, fields: Partial<Pick<Entry, "title" | "description" | "starred" | "tags">>) {
  const sets: string[] = [];
  const params: unknown[] = [];

  if (fields.title !== undefined) { sets.push("title = ?"); params.push(fields.title); }
  if (fields.description !== undefined) { sets.push("description = ?"); params.push(fields.description); }
  if (fields.starred !== undefined) { sets.push("starred = ?"); params.push(fields.starred); }
  if (fields.tags !== undefined) { sets.push("tags = ?"); params.push(fields.tags); }

  if (sets.length === 0) return;
  sets.push("updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now')");
  params.push(id);

  db().query(`UPDATE entries SET ${sets.join(", ")} WHERE id = ?`).run(...params);
}

export function deleteEntry(id: number) {
  db().query("DELETE FROM entries WHERE id = ?").run(id);
}

export function toggleStar(id: number): boolean {
  db().query("UPDATE entries SET starred = 1 - starred, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id = ?").run(id);
  const entry = getEntry(id);
  return entry?.starred === 1;
}

export function getAllTags(): { tag: string; count: number }[] {
  const entries = db().query("SELECT tags FROM entries").all() as { tags: string }[];
  const tagCounts = new Map<string, number>();
  for (const { tags } of entries) {
    for (const tag of JSON.parse(tags) as string[]) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }
  return Array.from(tagCounts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}

export function getStats() {
  const total = (db().query("SELECT COUNT(*) as n FROM entries").get() as { n: number }).n;
  const byType = db().query("SELECT type, COUNT(*) as n FROM entries GROUP BY type").all() as { type: string; n: number }[];
  const collections = (db().query("SELECT COUNT(*) as n FROM collections").get() as { n: number }).n;
  const starred = (db().query("SELECT COUNT(*) as n FROM entries WHERE starred = 1").get() as { n: number }).n;
  return { total, byType, collections, starred };
}

// --- Collections ---

export function createCollection(name: string, description?: string): Collection {
  db().query("INSERT INTO collections (name, description) VALUES (?, ?)").run(name, description ?? null);
  const id = db().query("SELECT last_insert_rowid() as id").get() as { id: number };
  return getCollection(id.id)!;
}

export function getCollection(id: number): Collection | null {
  return db().query(`
    SELECT c.*, COUNT(ce.entry_id) as entry_count
    FROM collections c
    LEFT JOIN collection_entries ce ON c.id = ce.collection_id
    WHERE c.id = ?
    GROUP BY c.id
  `).get(id) as Collection | null;
}

export function getCollectionByName(name: string): Collection | null {
  return db().query(`
    SELECT c.*, COUNT(ce.entry_id) as entry_count
    FROM collections c
    LEFT JOIN collection_entries ce ON c.id = ce.collection_id
    WHERE c.name = ?
    GROUP BY c.id
  `).get(name) as Collection | null;
}

export function listCollections(): Collection[] {
  return db().query(`
    SELECT c.*, COUNT(ce.entry_id) as entry_count
    FROM collections c
    LEFT JOIN collection_entries ce ON c.id = ce.collection_id
    GROUP BY c.id
    ORDER BY c.created_at DESC
  `).all() as Collection[];
}

export function addToCollection(collectionId: number, entryId: number) {
  const maxPos = db().query(
    "SELECT COALESCE(MAX(position), -1) + 1 as pos FROM collection_entries WHERE collection_id = ?"
  ).get(collectionId) as { pos: number };
  db().query(
    "INSERT OR IGNORE INTO collection_entries (collection_id, entry_id, position) VALUES (?, ?, ?)"
  ).run(collectionId, entryId, maxPos.pos);
}

export function removeFromCollection(collectionId: number, entryId: number) {
  db().query("DELETE FROM collection_entries WHERE collection_id = ? AND entry_id = ?").run(collectionId, entryId);
}

export function getCollectionEntries(collectionId: number): Entry[] {
  return db().query(`
    SELECT e.* FROM entries e
    JOIN collection_entries ce ON e.id = ce.entry_id
    WHERE ce.collection_id = ?
    ORDER BY ce.position ASC
  `).all(collectionId) as Entry[];
}

export function deleteCollection(id: number) {
  db().query("DELETE FROM collections WHERE id = ?").run(id);
}

// --- Synthesized Boards ---

export function saveSynthesizedBoard(collectionId: number, markdown: string, designBrief?: string): SynthesizedBoard {
  db().query("INSERT INTO synthesized_boards (collection_id, board_markdown, design_brief) VALUES (?, ?, ?)").run(
    collectionId, markdown, designBrief ?? null,
  );
  const id = db().query("SELECT last_insert_rowid() as id").get() as { id: number };
  return db().query("SELECT * FROM synthesized_boards WHERE id = ?").get(id.id) as SynthesizedBoard;
}

export function getLatestBoard(collectionId: number): SynthesizedBoard | null {
  return db().query(
    "SELECT * FROM synthesized_boards WHERE collection_id = ? ORDER BY created_at DESC LIMIT 1"
  ).get(collectionId) as SynthesizedBoard | null;
}

// --- Config ---

export function getConfig(key: string): string | null {
  const row = db().query("SELECT value FROM config WHERE key = ?").get(key) as { value: string } | null;
  return row?.value ?? null;
}

export function setConfig(key: string, value: string) {
  db().query("INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)").run(key, value);
}
