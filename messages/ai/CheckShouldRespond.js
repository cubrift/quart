const { MAX_MESSAGE_CONTEXT, CHECK_MODEL } = require("../../Config");
const { logger } = require("../../runtime/Globals");
const schema = require("./schemas/CheckShouldRespondSchema");
const { checkInstructions } = require("./SystemInstructions");
const { generateText, Output } = require("ai");

module.exports = async function checkShouldRespond(model, messages, abortController, retries = 5) {
  if (!messages) return false;
  if (!messages.find(f => typeof f.content === 'string')) return false;
  try {
    const { _output } = await generateText({
      model: model(CHECK_MODEL), // Always use cheapest model for quick processing and low quota
      output: Output.object({ schema }),
      system: checkInstructions,
      abortSignal: abortController.signal,
      messages: messages.slice(-10)
    });
    logger.debug(_output, 'Check should respond output');
    if (abortController.signal.aborted) return false;
    return _output.shouldRespond;
  } catch (error) {
    logger.error(error, 'Error occurred while checking if response is needed');
    if (abortController.signal.aborted || retries <= 0) return false;
    return checkShouldRespond(model, messages, abortController, retries - 1);
  }
}