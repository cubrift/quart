const { CHECK_MODEL } = require("../../Config");
const { logger } = require("../../runtime/Globals");
const schema = require("./schemas/CheckShouldRespondSchema");
const { checkInstructions } = require("./SystemInstructions");
const {
  buildShouldRespondMessages,
  isAssistantAuthoredCandidate,
  parseShouldRespondOutput,
} = require("./ShouldRespondContext");
const { generateText, Output } = require("ai");

module.exports = async function checkShouldRespond(model, messages, abortController, retries = 5) {
  if (!messages) return false;

  // Deterministic exclusions (kept minimal; model still decides social relevance).
  if (isAssistantAuthoredCandidate(messages)) return false;

  const contextMessages = buildShouldRespondMessages(messages);
  if (contextMessages.length === 0) return false;

  try {
    const { _output } = await generateText({
      model: model(CHECK_MODEL), // Always use cheapest model for quick processing and low quota
      output: Output.object({ schema }),
      system: checkInstructions,
      // Supported on the OpenAI Responses path used by CHECK_MODEL.
      // seed is NOT supported there (@ai-sdk/openai emits unsupported-feature warnings).
      temperature: 0,
      abortSignal: abortController.signal,
      messages: contextMessages,
    });
    logger.debug(_output, 'Check should respond output');
    if (abortController.signal.aborted) return false;

    const decision = parseShouldRespondOutput(_output);
    if (decision == null) return false;
    return decision;
  } catch (error) {
    logger.error(error, 'Error occurred while checking if response is needed');
    if (abortController.signal.aborted || retries <= 0) return false;
    abortController = new AbortController;
    return checkShouldRespond(model, messages, controller, retries - 1);
  }
}
