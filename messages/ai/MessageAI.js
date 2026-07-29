const { Poll } = require('../Poll');
const { saveMessage, getRecentHistory, userMessage, imageMessage, userMiscMessage, assistantMiscMessage, assistantMessage } = require('../MessageDatabase');
const checkShouldRespond = require('./CheckShouldRespond');
const { MODEL_NAME, EDIT_INTERVAL, CHECK_MODEL_NAME, MAX_MESSAGE_CONTEXT } = require("../../Config");
const { getSystemInstructions } = require("./SystemInstructions");
const schema = require("./schemas/AISchema");

const { generateText, streamText, Output, tool } = require("ai");
const AIChooseGIFSchema = require('./schemas/AIChooseGIFSchema');
const { createOpenAI, openai } = require('@ai-sdk/openai');
const { getRealLid, extractImageData } = require('../../Util');
const model = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const activeGenerations = new Map();

module.exports = async function messageAI(sock, msg, polls) {
  const jid = msg?.key?.remoteJid;
  const isStatus = jid?.startsWith("status");
  const isGroup = jid?.endsWith('@g.us');
  
  const msgText = msg.message?.conversation || msg.message?.extendedTextMessage?.text || msg.message?.imageMessage?.caption || "";
  if ((!msgText && !msg.message?.imageMessage) || msg.message?.reactionMessage || isStatus) return;

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

  if (isGroup
      && !msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.includes(getRealLid(sock.user.lid))
      && !msgText.toLowerCase().includes("quart")
      && !msg.message?.extendedTextMessage?.contextInfo?.nonJidMentions
      && !await checkShouldRespond(model, messages, controller)) {
    if (activeGenerations.get(jid) === controller)
      activeGenerations.delete(jid);
    return console.log("Ignoring");
  }

  //console.log("Responding");

  await sock.sendPresenceUpdate('composing', jid);

  let partialOutputStream = null;
  let usage = null;

  try {
    ({ partialOutputStream, usage } = await streamText({
      model: model(MODEL_NAME),
      output: Output.object({ schema }),
      abortSignal: controller.signal,
      tools: {
        web_search: openai.tools.webSearch()
      },
      onError: (err) => {
        if (controller.signal.aborted) return; // Ignore abort errors completely
        console.error("Stream internal error:", err);
      },
      system,
      messages
    }));

    if (controller.signal.aborted) return;

    console.log("Writing");

    let fullResponse = null;
    let lastEdit = Date.now();
    let key = null;
    let hitEnd = false;
    for await (const partial of partialOutputStream) {
      fullResponse = partial;
      console.log(partial);
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
              console.warn("Edit skipped:", e.message);
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
            const { participants } = await sock.groupMetadata(jid);
            participants.forEach(f => {
              console.log(message.text, f.id);
              if (message.text.includes("@" + f.id.split("@")[0]))
              {
                mentions.push(f.id);
              }
            });
          }
          await sock.sendMessage(jid, { text: message.text, edit: key, mentions });
          assistantMessage(jid, message.text);
          key = null;
        }
        if (message.poll) {
          const m = { poll: message.poll };
          const poll = new Poll(await sock.sendMessage(jid, m));
          poll.onVote = (vote, voteMsg) => {
            userMiscMessage(jid, voteMsg, "Voter", `voted for \"${vote}\" in Quart's poll \"${message.poll.name}\"`);
            messageAI(sock, jid, voteMsg, polls);
          }
          poll.onUnvote = (voteMsg) => {
            userMiscMessage(jid, voteMsg, "Voter", `unvoted in Quart's poll \"${message.poll.name}\"`);
            messageAI(sock, jid, voteMsg, polls);
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
              try {
                const res = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=${process.env.GIPHY_API_KEY}&q=${encodeURIComponent(message.gif.searchQuery)}`)
                if (res.ok) return res;
                else return repeatFetch(times - 1);
              }
              catch ({ error }) {
                console.log(error);
                return repeatFetch(times - 1);
              }
            }
            const res = await repeatFetch(10);
            const { data } = await res.json();
            const formattedCandidates = data.map((g, i) => `Option ${i+1}:
  - Title: ${g.title}
  - Description: ${g.alt_text}`);
            console.log(formattedCandidates);

            const selectorSystemPrompt = `You are Quart's GIF selector module.
  Quart wants to respond to the group chat with a GIF based on the search query: "${message.gif.searchQuery}".

  Your task:
  Analyze the recent group chat conversation and select the ONE GIF option (by index number) which title best fits the humor, mood, or joke of the situation.

  Here are the candidate GIFs returned from the search:
  ${formattedCandidates.join("\n")}`;

            await sock.sendPresenceUpdate('composing', jid);
            const { _output } = await generateText({
              model: model(CHECK_MODEL_NAME),
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
            if (controller.signal.aborted) return console.log("Aborted");
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
            console.log(gif);
            assistantMiscMessage(jid, JSON.stringify({
              type: "gif",
              title: gif.title,
              description: gif.altText
            }));
          }
          catch (e) {
            console.error(e);
            await sock.sendMessage(jid, { text: "_No GIF available._" });
            await sock.sendPresenceUpdate('paused', jid);
          }
        }
      }
    }
  }
  catch (e) {
    console.log("e");
    console.error(e);
    await sock.sendPresenceUpdate('paused', jid);
    return;
  }

  await sock.sendPresenceUpdate('paused', jid);

  console.log(await usage);
}