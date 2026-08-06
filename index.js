#!/usr/bin/env node

require('dotenv').config({ quiet: true }); 

const { confirm } = require('@clack/prompts');

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  getAggregateVotesInPollMessage,
  decryptPollVote,
  Browsers,
  fetchLatestWaWebVersion
} = require("baileys");

const pino = require("pino");
const qrcode = require("qrcode-terminal");

const messageAI = require('./messages/ai/MessageAI');

const crypto = require('crypto');
const { PHONE_NUMBER, AUTH_DIR } = require("./Config");
const { getRealLid } = require("./messages/Utils");
const { logger, initialize, shutdown, shutdownStack } = require("./runtime/Globals");
const { updateQRHost, stopQRHost } = require('./runtime/QRHost');
const { rm } = require('fs/promises');
const { db } = require('./messages/MessageDatabase');
const { handlePollMessage } = require('./messages/Poll');

const options = initialize();

function getOptionHash(optionName) {
  return crypto
    .createHash("sha256")
    .update(optionName)
    .digest();
}

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version, error } = await fetchLatestWaWebVersion({});

  const sock = makeWASocket({
    version,
    auth: state,
    logger: logger.child({ module: 'baileys' }),
    browser: [ 'Quart', 'Desktop', '1.0' ]
  });

  shutdownStack.push(
    sock.end,
    stopQRHost,
    db?.close
  );

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  sock.ev.on("connection.update", async ({ connection, qr, lastDisconnect }) => {
    if (qr) {
      console.clear();
      logger.info("QR Updated");
      if (options.terminal)
        qrcode.generate(qr, { small: true });
      else
        updateQRHost(qr);
    }

    if (connection === "open") {
      stopQRHost();
      logger.info("Connected!");
      logger.debug(sock.user, "User");
    }

    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;

      logger.fatal("Disconnected");

      sock.end();

      if (shouldReconnect) {
        setTimeout(startBot, 5000);
      }
      else {
        logger.info("Logged out");
        if (await confirm({ message: `Delete ${AUTH_DIR}/* and reconnect? (y/n) ` }) === true) {
          await rm(AUTH_DIR, { recursive: true });
          logger.info(`Deleted ${AUTH_DIR}/*`);
          startBot();
        }
      }
    }
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    try {
      if (type !== "notify") return;

      for (const msg of messages) {
        const jid = msg.key.remoteJid;
        if (!jid) continue;
        
        if (handlePollMessage(sock, msg)) continue;
        messageAI(sock, msg);
        await sock.sendPresenceUpdate('paused', jid);
      }
    } catch (error) {
      logger.error(error, "Error in messages.upsert event");
    }
  });
}

startBot();
