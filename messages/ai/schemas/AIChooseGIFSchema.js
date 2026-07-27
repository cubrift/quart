const { z } = require("zod");

module.exports = length => { return z.object({
  selectedIndex: z.number().min(1).max(length)
    .describe('The index of the chosen GIF candidate.')
})};