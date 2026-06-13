// ============================================================
// SQLite Database Setup & Migrations
// Uses expo-sqlite for local persistence
// ============================================================

import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;

  db = await SQLite.openDatabaseAsync('freepdf.db');

  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    -- PDF files stored / imported into the app
    CREATE TABLE IF NOT EXISTS pdf_files (
      id              TEXT PRIMARY KEY NOT NULL,
      uri             TEXT NOT NULL,
      name            TEXT NOT NULL,
      size            INTEGER NOT NULL DEFAULT 0,
      page_count      INTEGER NOT NULL DEFAULT 0,
      created_at      TEXT NOT NULL DEFAULT (datetime('now')),
      modified_at     TEXT NOT NULL DEFAULT (datetime('now')),
      is_favorite     INTEGER NOT NULL DEFAULT 0,
      thumbnail       TEXT
    );

    -- Operation history log
    CREATE TABLE IF NOT EXISTS operation_history (
      id              TEXT PRIMARY KEY NOT NULL,
      tool_id         TEXT NOT NULL,
      tool_name       TEXT NOT NULL,
      input_files     TEXT NOT NULL DEFAULT '[]',
      output_file     TEXT,
      status          TEXT NOT NULL DEFAULT 'idle',
      started_at      TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at    TEXT,
      error_message   TEXT
    );

    -- User settings (single-row table)
    CREATE TABLE IF NOT EXISTS user_settings (
      id                          INTEGER PRIMARY KEY NOT NULL DEFAULT 1,
      theme                       TEXT NOT NULL DEFAULT 'system',
      default_compression_quality INTEGER NOT NULL DEFAULT 80,
      auto_save_results           INTEGER NOT NULL DEFAULT 1,
      show_premium_badges         INTEGER NOT NULL DEFAULT 1,
      language                    TEXT NOT NULL DEFAULT 'en'
    );

    -- Favorite tools (tool IDs)
    CREATE TABLE IF NOT EXISTS favorite_tools (
      tool_id   TEXT PRIMARY KEY NOT NULL,
      added_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Ensure single settings row exists
    INSERT OR IGNORE INTO user_settings (id) VALUES (1);
  `);

  return db;
}

export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.closeAsync();
    db = null;
  }
}