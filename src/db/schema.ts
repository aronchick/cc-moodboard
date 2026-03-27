import { Database } from "bun:sqlite";
import { mkdirSync } from "fs";
import { join } from "path";

const MOODBOARD_DIR = join(process.env.HOME!, ".claude", "moodboards");
const ASSETS_DIR = join(MOODBOARD_DIR, "assets");
const DB_PATH = join(MOODBOARD_DIR, "moodboard.db");

export function getDbPath() {
  return DB_PATH;
}

export function getAssetsDir() {
  return ASSETS_DIR;
}

export function ensureDirs() {
  mkdirSync(MOODBOARD_DIR, { recursive: true });
  mkdirSync(ASSETS_DIR, { recursive: true });
}

export function initDb(): Database {
  ensureDirs();
  const db = new Database(DB_PATH, { create: true });
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS entries (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      type            TEXT NOT NULL CHECK(type IN ('url','image','color','font','note','screenshot')),
      source          TEXT DEFAULT 'manual',
      source_ref      TEXT,
      title           TEXT,
      content         TEXT NOT NULL,
      description     TEXT,
      asset_path      TEXT,
      thumbnail_path  TEXT,
      tags            TEXT DEFAULT '[]',
      metadata        TEXT DEFAULT '{}',
      starred         INTEGER DEFAULT 0,
      created_at      TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
      updated_at      TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
    );

    CREATE TABLE IF NOT EXISTS collections (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      name            TEXT NOT NULL UNIQUE,
      description     TEXT,
      cover_entry_id  INTEGER REFERENCES entries(id) ON DELETE SET NULL,
      created_at      TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
    );

    CREATE TABLE IF NOT EXISTS collection_entries (
      collection_id   INTEGER REFERENCES collections(id) ON DELETE CASCADE,
      entry_id        INTEGER REFERENCES entries(id) ON DELETE CASCADE,
      position        INTEGER DEFAULT 0,
      PRIMARY KEY (collection_id, entry_id)
    );

    CREATE TABLE IF NOT EXISTS synthesized_boards (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      collection_id   INTEGER REFERENCES collections(id) ON DELETE CASCADE,
      board_markdown  TEXT NOT NULL,
      design_brief    TEXT,
      created_at      TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
    );

    CREATE TABLE IF NOT EXISTS config (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_entries_type ON entries(type);
    CREATE INDEX IF NOT EXISTS idx_entries_starred ON entries(starred);
    CREATE INDEX IF NOT EXISTS idx_entries_created ON entries(created_at DESC);
  `);

  // FTS5 for full-text search
  try {
    db.exec(`
      CREATE VIRTUAL TABLE entries_fts USING fts5(
        title, content, description, tags,
        content=entries, content_rowid=id
      );

      CREATE TRIGGER entries_ai AFTER INSERT ON entries BEGIN
        INSERT INTO entries_fts(rowid, title, content, description, tags)
        VALUES (new.id, new.title, new.content, new.description, new.tags);
      END;

      CREATE TRIGGER entries_ad AFTER DELETE ON entries BEGIN
        INSERT INTO entries_fts(entries_fts, rowid, title, content, description, tags)
        VALUES ('delete', old.id, old.title, old.content, old.description, old.tags);
      END;

      CREATE TRIGGER entries_au AFTER UPDATE ON entries BEGIN
        INSERT INTO entries_fts(entries_fts, rowid, title, content, description, tags)
        VALUES ('delete', old.id, old.title, old.content, old.description, old.tags);
        INSERT INTO entries_fts(rowid, title, content, description, tags)
        VALUES (new.id, new.title, new.content, new.description, new.tags);
      END;
    `);
  } catch {
    // FTS table already exists
  }

  return db;
}

export function getDb(): Database {
  return initDb();
}

// Run directly to init
if (import.meta.main) {
  const db = initDb();
  const count = db.query("SELECT COUNT(*) as n FROM entries").get() as { n: number };
  console.log(`Database initialized at ${DB_PATH}`);
  console.log(`Entries: ${count.n}`);
  db.close();
}
