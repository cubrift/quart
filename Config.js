module.exports = {
    AUTH_DIR: process.env.AUTH_DIR || "./auth",
    DATABASE_PATH: process.env.DATABASE_PATH || "chat_history.db",
    RESPONSE_MODEL: "gpt-5.4-nano",
    TRANSCRIPTION_MODEL: "gpt-transcribe",
    TTS_MODEL: "gpt-audio-1.5",
    TTS_VOICE: "cedar",
    CHECK_MODEL: "gpt-4.1-nano",
    /** Recent text messages included in should-respond / lean tool context. */
    MAX_MESSAGE_CONTEXT: 10,
    EDIT_INTERVAL: 200, // ms
}
