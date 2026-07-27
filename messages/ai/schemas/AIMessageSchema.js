const { z } = require("zod");
const AIMessageTextSchema = require("./AIMessageTextSchema");
const AIMessagePollSchema = require("./AIMessagePollSchema");
const AIMessageLocationSchema = require("./AIMessageLocationSchema");
const AIMessageReactionSchema = require("./AIMessageReactionSchema");
const AIMessageGIFSchema = require("./AIMessageGIFSchema");

module.exports = z.object({
  text: AIMessageTextSchema,
  poll: AIMessagePollSchema,
  location: AIMessageLocationSchema,
  reaction: AIMessageReactionSchema,
  gif: AIMessageGIFSchema,
  "~0": z.literal(1),
  "~1": z.literal(1)
});