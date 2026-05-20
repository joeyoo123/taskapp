import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import path from "node:path";
import * as schema from "./schema";

const dbPath = process.env.TASKAPP_DB
  ? path.resolve(process.env.TASKAPP_DB)
  : path.resolve(process.cwd(), "tasks.db");

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    initials TEXT NOT NULL,
    color TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS spaces (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#7B68EE',
    position REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS folders (
    id TEXT PRIMARY KEY,
    space_id TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    position REAL NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS lists (
    id TEXT PRIMARY KEY,
    space_id TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    folder_id TEXT REFERENCES folders(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    position REAL NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    list_id TEXT NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
    parent_task_id TEXT,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'Open',
    priority TEXT NOT NULL DEFAULT 'normal',
    assignee_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    due_date TEXT,
    tags TEXT NOT NULL DEFAULT '[]',
    agent_spec TEXT,
    position REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS favorites (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL,
    ref_id TEXT NOT NULL,
    position REAL NOT NULL DEFAULT 0
  );
`);

export const db = drizzle(sqlite, { schema });
export { schema };
