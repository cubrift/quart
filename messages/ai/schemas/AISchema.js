const { z } = require("zod");
const AIMessage = require("./AIMessageSchema");

module.exports = z.object({
  messages: z.array(AIMessage)
    .nullable()
    .describe('Not everything the users will say require you to jump in. Only send a message when it feels appropriate.'),
})