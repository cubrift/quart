const { z } = require("zod");

module.exports = z
    .string()
    .nullable()
    .describe('The conversational text response.')