const Database = require('better-sqlite3');
const { extractImageData } = require('./Utils');
const db = new Database('chat_history.db');

// Create table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    jid TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp INTEGER NOT NULL
  )
`);

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

module.exports = {
  saveMessage,
  userMessage,
  userMiscMessage,
  imageMessage,
  assistantMessage,
  assistantMiscMessage,
  getRecentHistory
};