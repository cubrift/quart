const { MAX_MESSAGE_CONTEXT } = require("../../Config");

/** Fixed marker prepended to the candidate message in the evaluation template. */
const CANDIDATE_MARKER = "[CANDIDATE]";

function isNonEmptyTextMessage(msg) {
  return Boolean(msg && typeof msg.content === "string" && msg.content.trim().length > 0);
}

/**
 * Select recent text-only messages for the should-respond check.
 * Image/multimodal rows are excluded to keep the check cheap and deterministic.
 * Returns [] when the latest history row is not evaluable text, so we never
 * accidentally judge an older message as the candidate.
 */
function selectRecentTextMessages(messages, limit = MAX_MESSAGE_CONTEXT) {
  if (!Array.isArray(messages) || messages.length === 0) return [];

  const latest = messages[messages.length - 1];
  if (!isNonEmptyTextMessage(latest)) return [];

  const textMessages = messages.filter(isNonEmptyTextMessage);
  return textMessages.slice(-limit);
}

/**
 * Build the fixed-template conversation payload for should-respond evaluation.
 * System instructions stay static; only delimited conversation data changes.
 * The chronologically last text message is marked as the candidate.
 */
function buildShouldRespondMessages(messages, limit = MAX_MESSAGE_CONTEXT) {
  const recent = selectRecentTextMessages(messages, limit);
  if (recent.length === 0) return [];

  return recent.map((msg, index) => {
    if (index !== recent.length - 1) {
      return { role: msg.role, content: msg.content };
    }
    return {
      role: msg.role,
      content: `${CANDIDATE_MARKER}\n${msg.content}`,
    };
  });
}

function getCandidateMessage(messages, limit = MAX_MESSAGE_CONTEXT) {
  const recent = selectRecentTextMessages(messages, limit);
  return recent.length ? recent[recent.length - 1] : null;
}

function isAssistantAuthoredCandidate(messages, limit = MAX_MESSAGE_CONTEXT) {
  const candidate = getCandidateMessage(messages, limit);
  return Boolean(candidate && candidate.role === "assistant");
}

/**
 * Normalize model output into a boolean decision.
 * Returns null for empty/malformed/ambiguous values.
 */
function parseShouldRespondOutput(output) {
  if (output == null) return null;

  if (typeof output === "boolean") return output;

  if (typeof output === "object") {
    if (typeof output.shouldRespond === "boolean") return output.shouldRespond;
    if (typeof output.shouldRespond === "string") {
      return parseShouldRespondOutput(output.shouldRespond);
    }
    return null;
  }

  if (typeof output === "string") {
    const normalized = output.trim().toLowerCase();
    if (!normalized) return null;

    // Accept a lone token, optionally with surrounding whitespace/newlines.
    const firstLine = normalized.split(/\r?\n/, 1)[0].trim();
    if (firstLine === "true" || firstLine === "yes" || firstLine === "respond") {
      return true;
    }
    if (firstLine === "false" || firstLine === "no" || firstLine === "ignore") {
      return false;
    }

    // Reject verbose/ambiguous free-form answers.
    return null;
  }

  return null;
}

module.exports = {
  CANDIDATE_MARKER,
  isNonEmptyTextMessage,
  selectRecentTextMessages,
  buildShouldRespondMessages,
  getCandidateMessage,
  isAssistantAuthoredCandidate,
  parseShouldRespondOutput,
};
