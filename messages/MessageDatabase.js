const Database = require('better-sqlite3');
const { extractImageData } = require('./Utils');
const { DATABASE_PATH } = require('../Config');

const db = new Database(DATABASE_PATH);

/**
 * SQLite Schema Migration System
 *
 * Why migrations are needed:
 * Static `CREATE TABLE IF NOT EXISTS` queries fail to evolve existing schemas when
 * new columns, tables, or indices are introduced in subsequent application updates.
 *
 * How PRAGMA user_version works:
 * SQLite maintains an internal 32-bit integer (`user_version`) in the database header.
 * We query and update this value transactionally to apply missing incremental migrations
 * safely and deterministically without needing external migration tracking tables.
 */

const migrations = [
  {
    version: 1,
    up(db) {
      db.exec(`
        CREATE TABLE messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          jid TEXT NOT NULL,
          role TEXT NOT NULL,
          content TEXT NOT NULL,
          timestamp INTEGER NOT NULL
        );
      `);
    }
  },
  {
    version: 2,
    up(db) {
      db.exec(`
        CREATE INDEX idx_messages_jid_id ON messages(jid, id DESC);
      `);
    }
  }
].sort((a, b) => a.version - b.version);

const TARGET_VERSION = migrations.length > 0 ? migrations[migrations.length - 1].version : 0;

/**
 * Handles existing unversioned databases (created prior to versioning system)
 * where tables and indices already exist but user_version is 0.
 */
function bootstrapLegacyVersion(database) {
  const currentVersion = database.pragma('user_version', { simple: true });
  if (currentVersion !== 0) return currentVersion;

  const hasMessagesTable = !!database.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='messages'"
  ).get();

  if (!hasMessagesTable) return 0;

  const hasIndex = !!database.prepare(
    "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_messages_jid_id'"
  ).get();

  const legacyVersion = hasIndex ? 2 : 1;
  database.pragma(`user_version = ${legacyVersion}`);
  console.log(`[DB] Bootstrapped legacy unversioned database to version ${legacyVersion}`);
  return legacyVersion;
}

/**
 * Executes all pending schema migrations sequentially in a single transaction.
 */
function runMigrations(database) {
  let currentVersion = database.pragma('user_version', { simple: true });

  if (currentVersion === 0) {
    currentVersion = bootstrapLegacyVersion(database);
  }

  const pending = migrations.filter(m => m.version > currentVersion);

  console.log(`[DB] Current schema version: ${currentVersion}`);

  if (pending.length === 0) {
    console.log(`[DB] Final schema version: ${currentVersion}`);
    return currentVersion;
  }

  const applyMigrations = database.transaction((pendingMigrations) => {
    for (const migration of pendingMigrations) {
      console.log(`[DB] Applying migration v${migration.version}...`);
      migration.up(database);
      database.pragma(`user_version = ${migration.version}`);
      console.log(`[DB] Migration v${migration.version} applied successfully`);
    }
  });

  applyMigrations(pending);

  const finalVersion = database.pragma('user_version', { simple: true });
  console.log(`[DB] Final schema version: ${finalVersion}`);
  return finalVersion;
}

runMigrations(db);

// Save incoming/outgoing text message
function saveMessage(jid, role, content) {
  if (!content || !content.trim()) return;
  
  const stmt = db.prepare(
    'INSERT INTO messages (jid, role, content, timestamp) VALUES (?, ?, ?, ?)'
  );
  stmt.run(jid, role, content, Date.now());

  return content;
}

// Get last N messages for AI context
function getRecentHistory(jid) {
  const stmt = db.prepare(`
    SELECT role, content FROM (
      SELECT role, content, id FROM messages 
      WHERE jid = ? 
      ORDER BY id DESC
    ) ORDER BY id ASC
  `);
  
  return stmt.all(jid).map(msg => {
    if (msg.role === "image") return {
      role: "user",
      content: [
        { type: 'image', image: msg.content }
      ]
    }; else return msg
  });
}

function userMessage(jid, msg, content) {
  return saveMessage(jid, "user", `[${new Date().toISOString()}] ${msg?.pushName} ${jid?.endsWith('@g.us') ? `(mention ID: @${msg?.key?.participant?.split("@")?.[0]})` : ""}: ${content}`);
}

function userMiscMessage(jid, msg, prefix, suffix) {
  const message = `[${new Date().toISOString()}] ${prefix} ${msg?.pushName} ${jid?.endsWith('@g.us') ? `(mention ID: @${msg?.key?.participant?.split("@")?.[0]})` : ""} ${suffix}`;
  return saveMessage(jid, "user", message);
}

async function imageMessage(jid, msg) {
  return saveMessage(jid, "image", await extractImageData(msg));
}

function assistantMessage(jid, content) {
  return saveMessage(jid, "assistant", content)
}

function assistantMiscMessage(jid, content) {
  return assistantMessage(jid, " " + content); // temporary
}

function deleteMessagesBefore(timestamp) {
  if (typeof timestamp !== 'number' || !Number.isFinite(timestamp) || timestamp < 0) {
    throw new TypeError('Invalid timestamp: must be a non-negative finite number');
  }

  const stmt = db.prepare('DELETE FROM messages WHERE timestamp < ?');
  const info = stmt.run(timestamp);
  return info.changes;
}

module.exports = {
  db,
  runMigrations,
  migrations,
  TARGET_VERSION,
  saveMessage,
  userMessage,
  userMiscMessage,
  imageMessage,
  assistantMessage,
  assistantMiscMessage,
  getRecentHistory,
  deleteMessagesBefore
};