const { MODEL_NAME, CHECK_MODEL_NAME, MAX_MESSAGE_CONTEXT } = require("../../Config");
const schema = require("./schemas/CheckShouldRespondSchema");
const { checkInstructions } = require("./SystemInstructions");
const { generateText, Output } = require("ai");

module.exports = async function checkShouldRespond(model, messages, abortController) {
  if (!messages) return false;
  if (!messages.find(f => typeof f.content === 'string')) return false;
  try {
    const { _output } = await generateText({
      model: model(CHECK_MODEL_NAME), // Always use cheapest model for quick processing and low quota
      output: Output.object({ schema }),
      system: checkInstructions,
      abortSignal: abortController.signal,
      messages: messages.slice(-10)
    });
    console.log(_output);
    if (abortController.signal.aborted) return false;
    return _output.shouldRespond;
  } catch (error) {
    console.error(error);
    if (abortController.signal.aborted) return false;
    return checkShouldRespond(model, messages, abortController);
  }
}