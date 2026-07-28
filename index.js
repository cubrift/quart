// const express = require('express');
// const app = express();
// const PORT = process.env.PORT || 13430;

// const { Poll } = require('./messages/Poll');

// app.get('/', (req, res) => {
//   res.send('Bot is active and running 24/7!');
// });

// app.listen(PORT, () => {
//   console.log(`Ping server listening on port ${PORT}`);
// });

require('dotenv').config({ quiet: true }); 

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  getAggregateVotesInPollMessage,
  decryptPollVote
} = require("baileys");

const pino = require("pino");
const qrcode = require("qrcode-terminal");

const crypto = require('crypto');
const { PHONE_NUMBER } = require("./Config");
const { getRealLid } = require("./Util");
const messageAI = require('./messages/ai/MessageAI');

function getOptionHash(optionName) {
  return crypto
    .createHash("sha256")
    .update(optionName)
    .digest();
}

const MEAL_ENDPOINT = "https://themealdb.com/api/json/v1/1/";

const polls = new Map();

async function weather(latitude, longitude) {
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,wind_speed_10m_max,uv_index_max,apparent_temperature_max,apparent_temperature_min&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,cloud_cover,surface_pressure,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m&timezone=auto`);
  return await res.json();
}

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("./tmp");

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
    syncFullHistory: true,
    markOnlineOnConnect: false
  });
    
  if (!sock.authState.creds.registered) {
    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode(process.env.PHONE_NUMBER);
        console.log('\n====================================');
        console.log(`ENTER THIS PAIRING CODE ON YOUR PHONE: ${code}`);
        console.log('====================================\n');
      } catch (err) {
        console.error('Failed to generate pairing code:', err);
      }
    }, 3000); // Small delay to let the socket establish connection first
  }

  sock.ev.on("connection.update", ({ connection, qr, lastDisconnect }) => {
    if (qr) {
      console.clear();
      console.log("Scan this QR:\n");
      qrcode.generate(qr, { small: true });
    }

    if (connection === "open") {
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
