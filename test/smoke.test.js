const test = require("node:test");
const assert = require("node:assert");

test("Config module loads", () => {
    const config = require("../Config");
    assert.ok(config);
});

test("Logger module loads", () => {
    const logger = require("../runtime/Logger");
    assert.ok(logger.logger);
    assert.equal(typeof logger.handleRejection, "function");
});

test("Utils module loads", () => {
    const utils = require("../messages/Utils");
    assert.equal(typeof utils.getRealLid, "function");
    assert.equal(typeof utils.extractImageData, "function");
});

test("getRealLid converts LID correctly", () => {
    const { getRealLid } = require("../messages/Utils");

    assert.equal(
        getRealLid("123456:5@lid"),
        "123456@lid"
    );
});

test("Config exposes expected properties", () => {
    const config = require("../Config");

    assert.equal(typeof config.AUTH_DIR, "string");
    assert.equal(typeof config.DATABASE_PATH, "string");
    assert.equal(typeof config.RESPONSE_MODEL, "string");
    assert.equal(typeof config.TRANSCRIPTION_MODEL, "string");
    assert.equal(typeof config.TTS_MODEL, "string");
    assert.equal(typeof config.TTS_VOICE, "string");
    assert.equal(typeof config.CHECK_MODEL, "string");
    assert.equal(typeof config.EDIT_INTERVAL, "number");
});

test("handleRejection does not throw", () => {
    const { handleRejection } = require("../runtime/Logger");

    assert.doesNotThrow(() => {
        handleRejection(new Error("Smoke test"), Promise.resolve());
    });
});