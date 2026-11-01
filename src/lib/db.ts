import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

export type Db = Database.Database;

const DEFAULT_PATH = path.join(process.cwd(), "data", "app.db");

export function openDb(filePath: string = process.env.DATABASE_PATH ?? DEFAULT_PATH): Db {
  if (filePath !== ":memory:") {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
  }
  const db = new Database(filePath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  applySchema(db);
  return db;
}

export function applySchema(db: Db) {
  const schema = fs.readFileSync(path.join(process.cwd(), "src", "lib", "schema.sql"), "utf8");
  db.exec(schema);
}

declare global {
  // eslint-disable-next-line no-var
  var __appDb: Db | undefined;
}

// One shared connection per process. Next.js dev mode reloads modules, so the
// handle is cached on globalThis to avoid leaking connections.
export function getDb(): Db {
  if (!globalThis.__appDb) {
    globalThis.__appDb = openDb();
  }
  return globalThis.__appDb;
}
