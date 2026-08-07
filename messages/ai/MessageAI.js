const { generateText, streamText, Output, tool } = require("ai");
const { createOpenAI, openai: oai } = require('@ai-sdk/openai');
const { downloadMediaMessage } = require('baileys');

const { Poll, polls } = require('../Poll');
const { saveMessage, getRecentHistory, userMessage, imageMessage, userMiscMessage, assistantMiscMessage, assistantMessage } = require('../MessageDatabase');
const checkShouldRespond = require('./CheckShouldRespond');
const { RESPONSE_MODEL, EDIT_INTERVAL, CHECK_MODEL, MAX_MESSAGE_CONTEXT, TTS_MODEL, TRANSCRIPTION_MODEL, TTS_VOICE } = require("../../Config");
const { getSystemInstructions, ttsInstructions, gifSelectionSystemInstructions } = require("./SystemInstructions");
const schema = require("./schemas/AISchema");
const AIChooseGIFSchema = require('./schemas/AIChooseGIFSchema');
const { getRealLid, extractImageData } = require('../Utils');
const { logger, shutdownStack } = require('../../runtime/Globals');

const { default: OpenAI } = require('openai');
const openai = new OpenAI();

const model = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const activeGenerations = new Map();

shutdownStack.push(() => {
  for (const controller of activeGenerations.values()) {
    controller.abort();
  }
  activeGenerations.clear();
});

module.exports = async function messageAI(sock, msg) {
  const jid = msg?.key?.remoteJid;
  const isStatus = jid?.startsWith("status");
  const isGroup = jid?.endsWith('@g.us');
  
  const msgText = msg.message?.conversation || msg.message?.extendedTextMessage?.text || msg.message?.imageMessage?.caption || "";
  if ((!msgText && !msg.message?.imageMessage && !msg.message?.audioMessage) || msg.message?.reactionMessage || isStatus) return;

  const system = await getSystemInstructions(sock, jid);

  if (msgText === ".reset") {
    saveMessage(jid, "assistant", "I am now resetting myself and my tone with these instructions: " + system);
    await sock.sendMessage(jid, { text: "_Quart has been successfully reset._" });
    return; 
  }

  const quote = msg.message?.extendedTextMessage?.contextInfo;
  if (quote) {
    userMiscMessage(jid, msg, "User", `quoted the following message from the user with mention ID ${quote.participant}: ${quote.quotedMessage?.conversation || quote.quotedMessage?.extendedTextMessage?.text || ""}`)
    
    if (quote.quotedMessage?.imageMessage) {
      await imageMessage(jid, msg);
      saveMessage(jid, "user", `The caption of this image is: ${quote.quotedMessage?.imageMessage?.caption}`);
    }
  }

  if (msg.message?.imageMessage)
    await imageMessage(jid, msg);
  if (msgText)
    userMessage(jid, msg, msgText);

  const messages = getRecentHistory(jid);

  if (activeGenerations.has(jid)) {
    activeGenerations.get(jid).abort();
    activeGenerations.delete(jid);
  }

  const controller = new AbortController();
  activeGenerations.set(jid, controller);

  let transcript = null;

  if (msg.message.audioMessage) {
    const { text } = await openai.audio.transcriptions.create({
      file: await OpenAI.toFile(await downloadMediaMessage(msg, "buffer"), "input.ogg"),
      model: TRANSCRIPTION_MODEL,
    }, { signal: controller.signal });
    transcript = text;
    messages.push({ role: "user", content: userMiscMessage(jid, msg, "🎙 User", "sent a voice note with the following transcript: " + text) });
    logger.debug(text, "Received transcript");
    if (!text) return;
  }

  if (isGroup
      && !transcript
      && !msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.includes(getRealLid(sock.user.lid))
      && !msg.message?.extendedTextMessage?.contextInfo?.nonJidMentions
      && !await checkShouldRespond(model, messages, controller)) {
    if (activeGenerations.get(jid) === controller)
      activeGenerations.delete(jid);
    logger.debug("Ignoring text message");
    return;
  }

  if (msg.message.audioMessage) {
    await sock.sendPresenceUpdate('recording', jid);

    const res = await openai.chat.completions.create({
      model: TTS_MODEL,
      modalities: ["text", "audio"],
      audio: { voice: TTS_VOICE, format: "opus" },
      messages: [
        ...messages,
        {
          role: "user",
          content: transcript,
        },
      ]
    });

    if (res?.choices?.[0]) {
      const audioBuffer = Buffer.from(res.choices[0].message.audio.data, 'base64');
      assistantMiscMessage(jid, transcript);

      await sock.sendMessage(jid, {
        audio: audioBuffer,
        mimetype: 'audio/ogg; codecs=opus',
        ptt: true
      });
    } else {
      logger.error("No audio data returned from the model.");
    }
    return;
  }

  logger.debug("Responding...");

  await sock.sendPresenceUpdate('composing', jid);

  let partialOutputStream = null;
  let usage = null;

  try {
    ({ partialOutputStream, usage } = await streamText({
      model: model(RESPONSE_MODEL),
      output: Output.object({ schema }),
      abortSignal: controller.signal,
      tools: {
        web_search: oai.tools.webSearch()
      },
      onError: (err) => {
        if (controller.signal.aborted) return; // Ignore abort errors completely
        logger.error(err, "Stream internal error");
      },
      system,
      messages
    }));

    if (controller.signal.aborted) return;

    logger.debug("Writing...");

    let fullResponse = null;
    let lastEdit = Date.now();
    let key = null;
    let hitEnd = false;
    const groupParticipants = isGroup ? (await sock.groupMetadata(jid))?.participants || [] : [];
    for await (const partial of partialOutputStream) {
      fullResponse = partial;
      logger.debug(partial, "Partial response");
      if (!partial.messages) continue;
      for (const message of partial.messages) {
        if (controller.signal.aborted) break;
        if (hitEnd && message["~1"]) continue;
        if (message.text && !isGroup) {
          if (!key) {
            ({ key } = await sock.sendMessage(jid, { text: message.text }));
          } else if (Date.now() - lastEdit >= EDIT_INTERVAL) {
            try {
              await sock.sendMessage(jid, { 
                text: message.text,
                edit: key 
              });
              lastEdit = Date.now();
            } catch (e) {
              logger.warn(e, "Skipping edit due to error");
            }
          }
        }
        if (!message["~0"]) {
          hitEnd = true;
          continue;
        } // it is not done yet
        if (message.text) {
          let mentions = [];
          if (isGroup) {
            groupParticipants.forEach(f => {
              if (message.text.includes("@" + f.id.split("@")[0]))
              {
                mentions.push(f.id);
              }
            });
          }
          logger.debug({ message: message.text, mentions }, "AI response");
          await sock.sendMessage(jid, { text: message.text, edit: key, mentions });
          assistantMessage(jid, message.text);
          key = null;
        }
        if (message.poll) {
          const m = { poll: message.poll };
          const poll = new Poll(await sock.sendMessage(jid, m));
          poll.onVote = (vote, voteMsg) => {
            userMiscMessage(jid, voteMsg, "Voter", `voted for \"${vote}\" in Quart's poll \"${message.poll.name}\"`);
            messageAI(sock, voteMsg);
          }
          poll.onUnvote = (voteMsg) => {
            userMiscMessage(jid, voteMsg, "Voter", `unvoted in Quart's poll \"${message.poll.name}\"`);
            messageAI(sock, voteMsg);
          }
          polls.set(poll.msg.key.id, poll);
          assistantMiscMessage(jid, JSON.stringify(m));
        }
        if (message.location) {
          const m = { location: message.location };
          await sock.sendMessage(jid, m);
          assistantMiscMessage(jid, JSON.stringify(m));
        }
        if (message.reaction) {
          const m = { react: { text: message.reaction, key: msg.key } };
          await sock.sendMessage(jid, m);
          assistantMiscMessage(jid, JSON.stringify({ react: { text: m.react.text } }));
        }
        if (message.gif) {
          await sock.sendPresenceUpdate('composing', jid);
          try {
            async function repeatFetch(times) {
              if (times <= 0) logger.error("Failed to fetch GIFs after 10 attempts");
              try {
                const res = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=${process.env.GIPHY_API_KEY}&q=${encodeURIComponent(message.gif.searchQuery)}`)
                if (res.ok) return res;
                else return repeatFetch(times - 1);
              }
              catch (error) {
                logger.error(error, "Error fetching GIFs");
                return repeatFetch(times - 1);
              }
            }
            const res = await repeatFetch(10);
            const { data } = await res.json();
            const formattedCandidates = data.map((g, i) => `Option ${i+1}:
  - Title: ${g.title}
  - Description: ${g.alt_text}`);
            logger.debug({ candidates: formattedCandidates }, "Fetched GIF candidates");

            const selectorSystemPrompt = gifSelectionSystemInstructions(message.gif.searchQuery, formattedCandidates);

            await sock.sendPresenceUpdate('composing', jid);
            const { _output } = await generateText({
              model: model(CHECK_MODEL),
              output: Output.object({
                schema: AIChooseGIFSchema(formattedCandidates.length)
              }),
              system: selectorSystemPrompt,
              abortSignal: controller.signal,
              messages: messages.slice(-MAX_MESSAGE_CONTEXT).map(msg => {
                const cleanMsg = { ...msg };
                if (cleanMsg.role === 'assistant' && cleanMsg.content) {
                  cleanMsg.content = cleanMsg.content.replace(/https:\/\/media\.giphy\.com\/[^\s]+/g, '[GIF]');
                }
                return cleanMsg;
              })
            });
            if (controller.signal.aborted) return logger.debug("Aborted");
            const selection = (_output?.selectedIndex - 1) ?? 0;
            const gif = data[selection];
            const url = gif?.images?.original?.mp4;
            if (url) {
              await sock.sendMessage(jid, {
                video: { url },
                gifPlayback: true
              });
            }
            else {
              await sock.sendMessage(jid, { text: "_Unable to show GIF_" });
            }
            delete gif.images;
            logger.debug(gif, "Selected GIF");
            assistantMiscMessage(jid, JSON.stringify({
              type: "gif",
              title: gif.title,
              description: gif.altText
            }));
          }
          catch (e) {
            logger.error(e, "Error fetching GIFs");
            await sock.sendMessage(jid, { text: "_No GIF available._" });
          }
        }
      }
    }
  }
  catch (e) {
    logger.error(e, "Error occurred during AI response generation");
    return;
  }

  logger.info(await usage, "Usage statistics");
}