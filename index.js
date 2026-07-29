#!/usr/bin/env node

require('dotenv').config({ quiet: true }); 

const { program } = require('commander');
const prompt = require('prompt-sync')();

const { version } = require('./package.json');

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
const { PHONE_NUMBER } = require("./Config");
const { getRealLid } = require("./Util");
const { updateQRHost, stopQRHost } = require('./QRHost');
const { rm } = require('fs/promises');

program
  .name('quart')
  .description('An AI chatbot built for WhatsApp hosted using Baileys.')
  .version(version);

program
  .option('-v, --verbose', 'enable verbose output')
  .option('-t, --terminal', 'display the QR in the terminal');

program.parse(process.argv);
const options = program.opts();

function getOptionHash(optionName) {
  return crypto
    .createHash("sha256")
    .update(optionName)
    .digest();
}

const polls = new Map();

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("./auth");
  const { version, error } = await fetchLatestWaWebVersion({});

  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino(options.verbose ? {} : { level: "silent" }),
    browser: [ 'Quart', 'Desktop', '1.0' ]
  });

  sock.ev.on("connection.update", async ({ connection, qr, lastDisconnect }) => {
    if (qr) {
      console.clear();
      console.log("QR Updated");
      if (options.terminal)
        qrcode.generate(qr, { small: true });
      else
        updateQRHost(qr);
    }

    if (connection === "open") {
      stopQRHost();
      console.log("√ Connected!");
      console.log(sock.user?.lid);
    }

    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;

      console.log("Disconnected");

      if (shouldReconnect) {
        startBot();
      }
      else {
        console.log("Logged out")
        if (prompt("Delete /auth/* and reconnect? (y/n) ").trim() === "y")
        {
          await rm("./auth", { recursive: true });
          console.log("Deleted /auth/*");
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
        
        const update = msg.message?.pollUpdateMessage;
        if (update) {
          const pollKey = update.pollCreationMessageKey;

          const poll = polls.get(pollKey.id);
          if (poll) {
            const secret =
              poll.msg.message.messageContextInfo.messageSecret;

            // THIS IS STUPID BECAUSE BAILEYS IS STUPID
            const pollCreatorJid = poll.msg.key.fromMe
              ? getRealLid(sock.user.lid)
              : poll.msg.key.participant;

            const voterJid = msg.key.fromMe
              ? getRealLid(sock.user.lid)
              : msg.key.remoteJid.endsWith('@g.us')
                ? msg.key.participant
                : msg.key.remoteJid;

            const result = decryptPollVote(update.vote, {
              pollCreatorJid,
              pollMsgId: poll.msg.key.id,
              pollEncKey: secret,
              voterJid
            });

            const selected = result.selectedOptions[0];
            if (selected) {
              const option = poll.msg.message.pollCreationMessageV3.options.find(
                opt => Buffer.compare(getOptionHash(opt.optionName), selected) === 0
              );

              poll.onVote?.(option.optionName, msg);
            }
            else {
              poll.onUnvote?.(msg);
            }
          }
          continue;
        }
        messageAI(sock, msg, polls);
      }
    } catch (error) {
      console.error("GETGJTEOGJETOHGETJHOTEJJEH", error);
    }
  });
}

startBot();
