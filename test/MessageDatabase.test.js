const test = require("node:test");
const assert = require("node:assert/strict");

// Save original environment variable to restore after tests finish
const originalDatabasePath = process.env.DATABASE_PATH;

// Ensure environment variable is set to in-memory SQLite database prior to requiring module
process.env.DATABASE_PATH = ":memory:";

// Delete cached modules to guarantee fresh in-memory database instance
delete require.cache[require.resolve("../Config")];
delete require.cache[require.resolve("../messages/MessageDatabase")];

const {
  db,
  saveMessage,
  userMessage,
  userMiscMessage,
  imageMessage,
  assistantMessage,
  assistantMiscMessage,
  getRecentHistory,
  deleteMessagesBefore,
} = require("../messages/MessageDatabase");

test.beforeEach(() => {
  // Clear messages table before each test case for clean isolation
  db.exec("DELETE FROM messages");
});

test.after(() => {
  // Properly close database connection after all tests complete
  if (db && db.open) {
    db.close();
  }

  // Restore original process.env.DATABASE_PATH
  if (originalDatabasePath === undefined) {
    delete process.env.DATABASE_PATH;
  } else {
    process.env.DATABASE_PATH = originalDatabasePath;
  }

  // Remove our test module references from require.cache so subsequent test files re-initialize cleanly
  delete require.cache[require.resolve("../Config")];
  delete require.cache[require.resolve("../messages/MessageDatabase")];
});

test("A. Schema & Index - messages table and index exist", () => {
  const tableStmt = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='messages'"
  );
  const table = tableStmt.get();
  assert.ok(table, "messages table should exist");
  assert.equal(table.name, "messages");

  const indexStmt = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_messages_jid_id'"
  );
  const index = indexStmt.get();
  assert.ok(index, "idx_messages_jid_id index should exist");
  assert.equal(index.name, "idx_messages_jid_id");
});

test("B. saveMessage - inserts valid messages and ignores empty/invalid content", () => {
  // 1. Insert valid text message
  const result = saveMessage("user1@s.whatsapp.net", "user", "Hello AI");
  assert.equal(result, "Hello AI");

  const rows = db.prepare("SELECT * FROM messages WHERE jid = ?").all("user1@s.whatsapp.net");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].jid, "user1@s.whatsapp.net");
  assert.equal(rows[0].role, "user");
  assert.equal(rows[0].content, "Hello AI");
  assert.equal(typeof rows[0].timestamp, "number");

  // 2. Ignore empty / whitespace / null / undefined content
  assert.equal(saveMessage("user1@s.whatsapp.net", "user", ""), undefined);
  assert.equal(saveMessage("user1@s.whatsapp.net", "user", "   "), undefined);
  assert.equal(saveMessage("user1@s.whatsapp.net", "user", null), undefined);
  assert.equal(saveMessage("user1@s.whatsapp.net", "user", undefined), undefined);

  // Total count should remain 1
  const countStmt = db.prepare("SELECT COUNT(*) as count FROM messages");
  assert.equal(countStmt.get().count, 1);
});

test("C. getRecentHistory - retrieves history correctly for given jid with proper ordering and image handling", async () => {
  const jidA = "123456789@s.whatsapp.net";
  const jidB = "987654321@s.whatsapp.net";

  // 1. Empty history check
  const emptyHistory = getRecentHistory(jidA);
  assert.deepEqual(emptyHistory, []);

  // 2. Populate messages for jidA and jidB
  saveMessage(jidA, "user", "Message 1 from A");
  saveMessage(jidA, "assistant", "Response 1 to A");
  saveMessage(jidB, "user", "Message 1 from B");
  saveMessage(jidA, "image", "base64imagedata");
  saveMessage(jidA, "assistant", "Response 2 to A");

  // 3. Retrieve history for jidA
  const historyA = getRecentHistory(jidA);
  assert.equal(historyA.length, 4);

  // Verify chronological ordering (ascending by id)
  assert.equal(historyA[0].role, "user");
  assert.equal(historyA[0].content, "Message 1 from A");

  assert.equal(historyA[1].role, "assistant");
  assert.equal(historyA[1].content, "Response 1 to A");

  // Verify image transformation
  assert.equal(historyA[2].role, "user");
  assert.deepEqual(historyA[2].content, [
    { type: "image", image: "base64imagedata" },
  ]);

  assert.equal(historyA[3].role, "assistant");
  assert.equal(historyA[3].content, "Response 2 to A");

  // 4. Retrieve history for jidB (scoped check)
  const historyB = getRecentHistory(jidB);
  assert.equal(historyB.length, 1);
  assert.equal(historyB[0].content, "Message 1 from B");
});

test("D. deleteMessagesBefore - deletes older messages, returns deleted count, and validates inputs", () => {
  const jid = "group123@g.us";
  const stmt = db.prepare("INSERT INTO messages (jid, role, content, timestamp) VALUES (?, ?, ?, ?)");

  // Insert explicit timestamps
  stmt.run(jid, "user", "Old message 1", 1000);
  stmt.run(jid, "user", "Old message 2", 2000);
  stmt.run(jid, "user", "Boundary message", 3000);
  stmt.run(jid, "user", "New message 1", 4000);

  // Delete messages strictly before timestamp 3000
  const deletedCount = deleteMessagesBefore(3000);
  assert.equal(deletedCount, 2, "Should delete exactly 2 messages older than timestamp 3000");

  const remaining = db.prepare("SELECT timestamp, content FROM messages ORDER BY id ASC").all();
  assert.equal(remaining.length, 2);
  assert.equal(remaining[0].timestamp, 3000);
  assert.equal(remaining[0].content, "Boundary message");
  assert.equal(remaining[1].timestamp, 4000);
  assert.equal(remaining[1].content, "New message 1");

  // Invalid timestamp inputs should throw TypeError
  assert.throws(() => deleteMessagesBefore("1000"), TypeError);
  assert.throws(() => deleteMessagesBefore(NaN), TypeError);
  assert.throws(() => deleteMessagesBefore(-5), TypeError);
  assert.throws(() => deleteMessagesBefore(null), TypeError);
  assert.throws(() => deleteMessagesBefore(undefined), TypeError);
});

test("E. Message helper functions format and save correctly", () => {
  const directJid = "user1@s.whatsapp.net";
  const groupJid = "123456@g.us";

  // userMessage
  userMessage(directJid, { pushName: "Alice" }, "Hi there");
  const row1 = db.prepare("SELECT * FROM messages WHERE jid = ?").get(directJid);
  assert.ok(row1.content.includes("Alice"));
  assert.ok(row1.content.includes("Hi there"));

  // group userMessage with mention format
  userMessage(groupJid, { pushName: "Bob", key: { participant: "987654@s.whatsapp.net" } }, "Group chat");
  const row2 = db.prepare("SELECT * FROM messages WHERE jid = ?").get(groupJid);
  assert.ok(row2.content.includes("Bob"));
  assert.ok(row2.content.includes("mention ID: @987654"));

  // assistantMessage and assistantMiscMessage
  assistantMessage(directJid, "Direct reply");
  assistantMiscMessage(directJid, "Misc reply");

  const assistantRows = db.prepare("SELECT * FROM messages WHERE role = 'assistant'").all();
  assert.equal(assistantRows.length, 2);
  assert.equal(assistantRows[0].content, "Direct reply");
  assert.equal(assistantRows[1].content, " Misc reply");
});
