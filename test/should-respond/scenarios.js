/**
 * Shared should-respond evaluation scenarios.
 * Use the same exact set for before/after comparisons.
 *
 * expected: true = Quart should respond, false = should not
 */

function msg(role, sender, text, extras = {}) {
  const mention = extras.mentionId ? ` (mention ID: @${extras.mentionId})` : "";
  const ts = extras.ts || "2026-08-04T12:00:00.000Z";
  return {
    role,
    content: `[${ts}] ${sender}${mention}: ${text}`,
  };
}

function quote(sender, mentionId, quotedFrom, quotedText, ts) {
  return {
    role: "user",
    content: `[${ts || "2026-08-04T12:00:00.000Z"}] User ${sender} (mention ID: @${mentionId}) quoted the following message from the user with mention ID ${quotedFrom}: ${quotedText}`,
  };
}

const scenarios = [
  // ─── SHOULD RESPOND ───────────────────────────────────────────────
  {
    id: "SR-001",
    category: "should-respond",
    subcategory: "direct-quart-mention",
    expected: true,
    rationale: "Explicit 'Quart' address in the candidate message.",
    messages: [
      msg("user", "Alex", "anyone around?", { mentionId: "111", ts: "2026-08-04T12:00:00.000Z" }),
      msg("user", "Sam", "hey Quart what time is it in Tokyo?", { mentionId: "222", ts: "2026-08-04T12:00:10.000Z" }),
    ],
  },
  {
    id: "SR-002",
    category: "should-respond",
    subcategory: "at-mention",
    expected: true,
    rationale: "WhatsApp-style @mention of Quart in the candidate text.",
    messages: [
      msg("user", "Alex", "busy day", { mentionId: "111", ts: "2026-08-04T12:00:00.000Z" }),
      msg("user", "Sam", "@Quart can you summarize the plan?", { mentionId: "222", ts: "2026-08-04T12:00:10.000Z" }),
    ],
  },
  {
    id: "SR-003",
    category: "should-respond",
    subcategory: "nickname-mention",
    expected: true,
    rationale: "Configured/group nickname used for Quart.",
    messages: [
      msg("user", "Alex", "our bot is named Q", { mentionId: "111", ts: "2026-08-04T12:00:00.000Z" }),
      msg("user", "Sam", "Q, what's a good icebreaker?", { mentionId: "222", ts: "2026-08-04T12:00:10.000Z" }),
    ],
  },
  {
    id: "SR-004",
    category: "should-respond",
    subcategory: "indirect-the-ai",
    expected: true,
    rationale: "Indirect reference inviting the AI to answer.",
    messages: [
      msg("user", "Alex", "I'm stuck on this trivia", { mentionId: "111", ts: "2026-08-04T12:00:00.000Z" }),
      msg("user", "Sam", "ask the AI who invented the telephone", { mentionId: "222", ts: "2026-08-04T12:00:10.000Z" }),
    ],
  },
  {
    id: "SR-005",
    category: "should-respond",
    subcategory: "room-wide-factual",
    expected: true,
    rationale: "Room-wide factual question to anyone.",
    messages: [
      msg("user", "Alex", "Does anyone know when the museum opens tomorrow?", { mentionId: "111", ts: "2026-08-04T12:00:10.000Z" }),
    ],
  },
  {
    id: "SR-006",
    category: "should-respond",
    subcategory: "room-wide-encouragement",
    expected: true,
    rationale: "Room-wide request for encouragement/help.",
    messages: [
      msg("user", "Alex", "Can everyone give me some encouragement? Interview in an hour.", { mentionId: "111", ts: "2026-08-04T12:00:10.000Z" }),
    ],
  },
  {
    id: "SR-007",
    category: "should-respond",
    subcategory: "context-free-open-question",
    expected: true,
    rationale: "Open question without private prior context.",
    messages: [
      msg("user", "Alex", "What happened on the news last week?", { mentionId: "111", ts: "2026-08-04T12:00:10.000Z" }),
    ],
  },
  {
    id: "SR-008",
    category: "should-respond",
    subcategory: "context-free-personal-statement",
    expected: true,
    rationale: "Open personal statement a participant could naturally join.",
    messages: [
      msg("user", "Alex", "I'm feeling happy today", { mentionId: "111", ts: "2026-08-04T12:00:10.000Z" }),
    ],
  },
  {
    id: "SR-009",
    category: "should-respond",
    subcategory: "announcement",
    expected: true,
    rationale: "Group announcement where a natural reaction fits.",
    messages: [
      msg("user", "Alex", "Happy birthday David!", { mentionId: "111", ts: "2026-08-04T12:00:10.000Z" }),
    ],
  },
  {
    id: "SR-010",
    category: "should-respond",
    subcategory: "joke-or-meme",
    expected: true,
    rationale: "Joke where a short natural reaction is appropriate.",
    messages: [
      msg("user", "Alex", "Why do programmers prefer dark mode? Because light attracts bugs.", { mentionId: "111", ts: "2026-08-04T12:00:10.000Z" }),
    ],
  },
  {
    id: "SR-011",
    category: "should-respond",
    subcategory: "unfortunate-event",
    expected: true,
    rationale: "Unfortunate personal event where empathy is natural.",
    messages: [
      msg("user", "Alex", "I just failed my driving test again :(", { mentionId: "111", ts: "2026-08-04T12:00:10.000Z" }),
    ],
  },
  {
    id: "SR-012",
    category: "should-respond",
    subcategory: "news-update",
    expected: true,
    rationale: "Recent news/update where group participation is natural.",
    messages: [
      msg("user", "Alex", "Just saw that the city metro line finally opened today!", { mentionId: "111", ts: "2026-08-04T12:00:10.000Z" }),
    ],
  },
  {
    id: "SR-013",
    category: "should-respond",
    subcategory: "follow-up-to-quart",
    expected: true,
    rationale: "Clear follow-up to Quart without repeating the name.",
    messages: [
      msg("user", "Alex", "Quart, recommend a pasta recipe", { mentionId: "111", ts: "2026-08-04T12:00:00.000Z" }),
      { role: "assistant", content: "cacio e pepe is an easy win if you have pecorino" },
      msg("user", "Alex", "cool, how long does that take?", { mentionId: "111", ts: "2026-08-04T12:00:20.000Z" }),
    ],
  },

  // ─── SHOULD NOT RESPOND ───────────────────────────────────────────
  {
    id: "SN-001",
    category: "should-not-respond",
    subcategory: "two-user-banter",
    expected: false,
    rationale: "Specific background banter between two people.",
    messages: [
      msg("user", "Alex", "did you finish that spreadsheet for finance?", { mentionId: "111", ts: "2026-08-04T12:00:00.000Z" }),
      msg("user", "Sam", "yeah, emailed it to Priya an hour ago", { mentionId: "222", ts: "2026-08-04T12:00:10.000Z" }),
      msg("user", "Alex", "perfect, tell her I'll review after lunch", { mentionId: "111", ts: "2026-08-04T12:00:20.000Z" }),
    ],
  },
  {
    id: "SN-002",
    category: "should-not-respond",
    subcategory: "question-to-named-person",
    expected: false,
    rationale: "Direct question clearly addressed to another named person.",
    messages: [
      msg("user", "Alex", "hey Sam, can you send me the WiFi password?", { mentionId: "111", ts: "2026-08-04T12:00:10.000Z" }),
    ],
  },
  {
    id: "SN-003",
    category: "should-not-respond",
    subcategory: "acknowledgement-in-pair-exchange",
    expected: false,
    rationale: "Short acknowledgement inside another pair's exchange.",
    messages: [
      msg("user", "Alex", "I'll bring the charger tonight", { mentionId: "111", ts: "2026-08-04T12:00:00.000Z" }),
      msg("user", "Sam", "thanks", { mentionId: "222", ts: "2026-08-04T12:00:10.000Z" }),
    ],
  },
  {
    id: "SN-004",
    category: "should-not-respond",
    subcategory: "fragment-private-subconversation",
    expected: false,
    rationale: "Fragment whose meaning depends on a private sub-conversation.",
    messages: [
      msg("user", "Alex", "use the second option we talked about", { mentionId: "111", ts: "2026-08-04T12:00:00.000Z" }),
      msg("user", "Sam", "the blue one?", { mentionId: "222", ts: "2026-08-04T12:00:10.000Z" }),
      msg("user", "Alex", "yeah that", { mentionId: "111", ts: "2026-08-04T12:00:20.000Z" }),
    ],
  },
  {
    id: "SN-005",
    category: "should-not-respond",
    subcategory: "quoted-old-quart-mention",
    expected: false,
    rationale: "Quotes an old Quart mention but is not currently addressing Quart.",
    messages: [
      quote("Alex", "111", "@999", "Quart said meet at 6", "2026-08-04T12:00:00.000Z"),
      msg("user", "Alex", "Sam that was last week, ignore it", { mentionId: "111", ts: "2026-08-04T12:00:10.000Z" }),
    ],
  },
  {
    id: "SN-006",
    category: "should-not-respond",
    subcategory: "system-operational-event",
    expected: false,
    rationale: "Unrelated operational/system-style event, not a social invitation.",
    messages: [
      msg("user", "System", "backup completed for chat_history.db", { mentionId: "000", ts: "2026-08-04T12:00:10.000Z" }),
    ],
  },
  {
    id: "SN-007",
    category: "should-not-respond",
    subcategory: "quart-own-message",
    expected: false,
    rationale: "Candidate was authored by Quart (assistant).",
    messages: [
      msg("user", "Alex", "what's up everyone", { mentionId: "111", ts: "2026-08-04T12:00:00.000Z" }),
      { role: "assistant", content: "hey! just vibing in the chat" },
    ],
  },
  {
    id: "SN-008",
    category: "should-not-respond",
    subcategory: "stale-mention-in-older-context",
    expected: false,
    rationale: "Quart mention appears only in older context; candidate is unrelated banter.",
    messages: [
      msg("user", "Alex", "Quart was funny yesterday", { mentionId: "111", ts: "2026-08-04T11:00:00.000Z" }),
      msg("user", "Sam", "lol true", { mentionId: "222", ts: "2026-08-04T11:00:10.000Z" }),
      msg("user", "Alex", "anyway Sam are you free at 5?", { mentionId: "111", ts: "2026-08-04T12:00:10.000Z" }),
    ],
  },
  {
    id: "SN-009",
    category: "should-not-respond",
    subcategory: "private-looking-answer",
    expected: false,
    rationale: "Private-looking answer to a previous human question.",
    messages: [
      msg("user", "Alex", "Sam what's your apartment number again?", { mentionId: "111", ts: "2026-08-04T12:00:00.000Z" }),
      msg("user", "Sam", "4B, buzz twice", { mentionId: "222", ts: "2026-08-04T12:00:10.000Z" }),
    ],
  },
  {
    id: "SN-010",
    category: "should-not-respond",
    subcategory: "empty-unsupported",
    expected: false,
    rationale: "Empty/unsupported content should not invite a reply.",
    messages: [
      msg("user", "Alex", "hello", { mentionId: "111", ts: "2026-08-04T12:00:00.000Z" }),
      { role: "user", content: "   " },
    ],
  },

  // ─── AMBIGUOUS EDGE CASES ─────────────────────────────────────────
  {
    id: "AE-001",
    category: "ambiguous",
    subcategory: "rhetorical-question",
    expected: false,
    rationale: "Rhetorical venting in a two-person exchange; intervening is usually noise.",
    messages: [
      msg("user", "Alex", "Sam canceled on me again", { mentionId: "111", ts: "2026-08-04T12:00:00.000Z" }),
      msg("user", "Sam", "wow who even does that?", { mentionId: "222", ts: "2026-08-04T12:00:10.000Z" }),
    ],
  },
  {
    id: "AE-002",
    category: "ambiguous",
    subcategory: "vague-what-do-you-think",
    expected: true,
    rationale: "Vague room-facing solicit of opinions after shared context.",
    messages: [
      msg("user", "Alex", "we're deciding between pizza and sushi for the meetup", { mentionId: "111", ts: "2026-08-04T12:00:00.000Z" }),
      msg("user", "Sam", "what do you think?", { mentionId: "222", ts: "2026-08-04T12:00:10.000Z" }),
    ],
  },
  {
    id: "AE-003",
    category: "ambiguous",
    subcategory: "reply-without-explicit-mention",
    expected: true,
    rationale: "Reply continuing a thread Quart was just in, without renaming Quart.",
    messages: [
      msg("user", "Alex", "Quart pick a number 1-10", { mentionId: "111", ts: "2026-08-04T12:00:00.000Z" }),
      { role: "assistant", content: "7" },
      msg("user", "Alex", "why that one?", { mentionId: "111", ts: "2026-08-04T12:00:20.000Z" }),
    ],
  },
  {
    id: "AE-004",
    category: "ambiguous",
    subcategory: "announcement-then-private-follow-up",
    expected: false,
    rationale: "After a group announcement, a private logistics follow-up between two people.",
    messages: [
      msg("user", "Alex", "Merry Christmas everyone!", { mentionId: "111", ts: "2026-08-04T12:00:00.000Z" }),
      msg("user", "Sam", "Alex, can you still drop the gifts at my place?", { mentionId: "222", ts: "2026-08-04T12:00:10.000Z" }),
    ],
  },
  {
    id: "AE-005",
    category: "ambiguous",
    subcategory: "media-only-no-text",
    expected: false,
    rationale: "Media/image history with no useful textual candidate.",
    messages: [
      {
        role: "user",
        content: [{ type: "image", image: "data:image/png;base64,abc" }],
      },
    ],
  },
  {
    id: "AE-006",
    category: "ambiguous",
    subcategory: "sarcasm",
    expected: false,
    rationale: "Sarcastic aside aimed at another person, not the room.",
    messages: [
      msg("user", "Alex", "Sam forgot the tickets", { mentionId: "111", ts: "2026-08-04T12:00:00.000Z" }),
      msg("user", "Jordan", "oh great, love that for us Sam", { mentionId: "333", ts: "2026-08-04T12:00:10.000Z" }),
    ],
  },
  {
    id: "AE-007",
    category: "ambiguous",
    subcategory: "multiple-threads",
    expected: false,
    rationale: "Candidate continues a side thread between two people amid other chatter.",
    messages: [
      msg("user", "Alex", "game night Friday?", { mentionId: "111", ts: "2026-08-04T12:00:00.000Z" }),
      msg("user", "Sam", "Priya, did payroll go out?", { mentionId: "222", ts: "2026-08-04T12:00:05.000Z" }),
      msg("user", "Priya", "yes Sam, posted at noon", { mentionId: "444", ts: "2026-08-04T12:00:10.000Z" }),
      msg("user", "Sam", "thanks, I'll close the ticket", { mentionId: "222", ts: "2026-08-04T12:00:15.000Z" }),
    ],
  },
  {
    id: "AE-008",
    category: "ambiguous",
    subcategory: "mention-inside-quoted-text",
    expected: false,
    rationale: "Mention only inside quoted/copied text; candidate is not inviting Quart.",
    messages: [
      quote("Alex", "111", "@222", "tell Quart to join later", "2026-08-04T12:00:00.000Z"),
      msg("user", "Alex", "Sam I'm forwarding that old note to you", { mentionId: "111", ts: "2026-08-04T12:00:10.000Z" }),
    ],
  },
  {
    id: "AE-009",
    category: "ambiguous",
    subcategory: "dont-ask-the-ai",
    expected: false,
    rationale: "Explicit request not to involve the AI.",
    messages: [
      msg("user", "Alex", "how do we fix the sink?", { mentionId: "111", ts: "2026-08-04T12:00:00.000Z" }),
      msg("user", "Sam", "don't ask the AI, I already know the part number", { mentionId: "222", ts: "2026-08-04T12:00:10.000Z" }),
    ],
  },
  {
    id: "AE-010",
    category: "ambiguous",
    subcategory: "discussing-quart-not-inviting",
    expected: false,
    rationale: "Users discuss Quart in third person without inviting a reply.",
    messages: [
      msg("user", "Alex", "Quart has been quieter lately", { mentionId: "111", ts: "2026-08-04T12:00:00.000Z" }),
      msg("user", "Sam", "yeah maybe David changed the prompt", { mentionId: "222", ts: "2026-08-04T12:00:10.000Z" }),
    ],
  },
];

function getScenariosByCategory(category) {
  return scenarios.filter((s) => s.category === category);
}

function getScenarioById(id) {
  return scenarios.find((s) => s.id === id);
}

module.exports = {
  scenarios,
  getScenariosByCategory,
  getScenarioById,
};
