const { z } = require("zod");

module.exports = z
    .string()
    .nullable()
    .describe('React to a message with a single emoji. The text must be a single emoji character. Use often to hype conversations.');