const { z } = require("zod");

module.exports =
    z.object({
        shouldRespond: z
            .boolean()
            .describe("true if Quart should reply to the [CANDIDATE] message; false otherwise."),
    }).strict();
