const { z } = require("zod");

module.exports = z
    .object({
        degreesLatitude: z.number().describe('Latitude value, e.g. -4.6796'),
        degreesLongitude: z.number().describe('Longitude value, e.g. 55.4920'),
        name: z.string().nullable().describe('Place or venue name'),
        address: z.string().nullable().describe('Street address or descriptive area')
    })
    .nullable()