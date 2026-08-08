const test = require('node:test');
const assert = require('node:assert');
const Database = require('better-sqlite3');
const { runMigrations, migrations, saveMessage, getRecentHistory, deleteMessagesBefore, db } = require('../messages/MessageDatabase');

test('Fresh database (v0) migrates to latest version (v2)', () => {
  const testDb = new Database(':memory:');
  const initialVersion = testDb.pragma('user_version', { simple: true });
  assert.strictEqual(initialVersion, 0);

  const finalVersion = runMigrations(testDb);
  assert.strictEqual(finalVersion, 2);
  assert.strictEqual(testDb.pragma('user_version', { simple: true }), 2);

  // Verify messages table schema exists
  const tables = testDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='messages'").all();
  assert.strictEqual(tables.length, 1);

  // Verify index exists
  const indexes = testDb.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_messages_jid_id'").all();
  assert.strictEqual(indexes.length, 1);

  testDb.close();
});

test('Incremental migration from v1 to v2', () => {
  const testDb = new Database(':memory:');
  
  // Apply only v1 manually
  migrations[0].up(testDb);
  testDb.pragma('user_version = 1');

  assert.strictEqual(testDb.pragma('user_version', { simple: true }), 1);

  // Run migration runner
  const finalVersion = runMigrations(testDb);
  assert.strictEqual(finalVersion, 2);
  assert.strictEqual(testDb.pragma('user_version', { simple: true }), 2);

  // Index should now exist
  const indexes = testDb.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_messages_jid_id'").all();
  assert.strictEqual(indexes.length, 1);

  testDb.close();
});

test('Legacy database (v0 with existing schema) bootstraps version correctly', () => {
  const testDb = new Database(':memory:');
  
  // Create schema manually with v0 (simulating pre-migration app state)
  migrations[0].up(testDb);
  migrations[1].up(testDb);
  assert.strictEqual(testDb.pragma('user_version', { simple: true }), 0);

  // Migration runner should detect legacy schema and set version to 2 without throwing error
  const finalVersion = runMigrations(testDb);
  assert.strictEqual(finalVersion, 2);
  assert.strictEqual(testDb.pragma('user_version', { simple: true }), 2);

  testDb.close();
});

test('Idempotency: running migrations on up-to-date database does nothing', () => {
  const testDb = new Database(':memory:');
  runMigrations(testDb);
  assert.strictEqual(testDb.pragma('user_version', { simple: true }), 2);

  // Run again
  const secondRunVersion = runMigrations(testDb);
  assert.strictEqual(secondRunVersion, 2);
  assert.strictEqual(testDb.pragma('user_version', { simple: true }), 2);

  testDb.close();
});

test('Transaction safety: rollback on migration failure', () => {
  const testDb = new Database(':memory:');

  // Custom migration set where 2nd migration throws an error
  const invalidMigrations = [
    {
      version: 1,
      up(d) {
        d.exec('CREATE TABLE messages (id INTEGER PRIMARY KEY);');
      }
    },
    {
      version: 2,
      up(d) {
        throw new Error('Simulated failure during migration 2');
      }
    }
  ];

  function runFaultyMigrations(database) {
    const currentVersion = database.pragma('user_version', { simple: true });
    const pending = invalidMigrations.filter(m => m.version > currentVersion);

    const apply = database.transaction((pendingMigrations) => {
      for (const migration of pendingMigrations) {
        migration.up(database);
        database.pragma(`user_version = ${migration.version}`);
      }
    });

    apply(pending);
  }

  assert.throws(() => runFaultyMigrations(testDb), /Simulated failure/);

  // Version must remain 0 and table 'messages' must NOT exist due to transaction rollback
  assert.strictEqual(testDb.pragma('user_version', { simple: true }), 0);
  const tables = testDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='messages'").all();
  assert.strictEqual(tables.length, 0);

  testDb.close();
});

test('Exported MessageDatabase functions work as expected', () => {
  const jid = '123456789@s.whatsapp.net';
  
  // Clean state for test jid
  db.prepare('DELETE FROM messages WHERE jid = ?').run(jid);

  saveMessage(jid, 'user', 'Hello AI');
  saveMessage(jid, 'assistant', 'Hello User');

  const history = getRecentHistory(jid);
  assert.strictEqual(history.length, 2);
  assert.strictEqual(history[0].role, 'user');
  assert.strictEqual(history[0].content, 'Hello AI');
  assert.strictEqual(history[1].role, 'assistant');
  assert.strictEqual(history[1].content, 'Hello User');

  const deleted = deleteMessagesBefore(Date.now() + 1000);
  assert.ok(deleted >= 2);
});
