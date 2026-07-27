const { z } = require("zod");

module.exports =
    z.object({
        think: z.string().describe("Think about why there should or should not be a response first."),
        shouldRespond: z.boolean().describe("Follow instructions."),
    });