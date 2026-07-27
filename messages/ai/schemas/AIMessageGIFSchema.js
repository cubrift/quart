const { z } = require("zod");

module.exports = z
    .object({
        searchQuery: z.string().describe('Search term for Giphy')
    })
    .nullable()
    .describe('React to a message with a GIF. Use often to hype conversations.')