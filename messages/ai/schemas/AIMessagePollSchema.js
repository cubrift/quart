const { z } = require("zod");

module.exports = z
    .object({
        name: z.string().describe('The poll question.'),
        values: z.array(z.string()).min(2).max(12).describe('Poll options.'),
        selectableCount: z.number().describe('Max selections allowed.')
    })
    .nullable();