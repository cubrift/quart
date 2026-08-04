const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { checkInstructions } = require("../../messages/ai/SystemInstructions");
const schema = require("../../messages/ai/schemas/CheckShouldRespondSchema");
const {
  CANDIDATE_MARKER,
  buildShouldRespondMessages,
  selectRecentTextMessages,
  getCandidateMessage,
  isAssistantAuthoredCandidate,
  parseShouldRespondOutput,
} = require("../../messages/ai/ShouldRespondContext");
const { scenarios, getScenariosByCategory, getScenarioById } = require("./scenarios");
const { MAX_MESSAGE_CONTEXT } = require("../../Config");

const baselinePrompt = fs.readFileSync(
  path.join(__dirname, "baseline-prompt.txt"),
  "utf8"
);

test("should-respond prompt is a static string", () => {
  assert.equal(typeof checkInstructions, "string");
  assert.ok(checkInstructions.includes("[CANDIDATE]"));
  assert.ok(checkInstructions.includes("shouldRespond=true"));
  assert.ok(checkInstructions.includes("shouldRespond=false"));
  assert.doesNotMatch(checkInstructions, /\$\{/);
});

test("should-respond prompt instructions do not change across scenarios", () => {
  const prompts = scenarios.map(() => checkInstructions);
  for (const prompt of prompts) {
    assert.equal(prompt, checkInstructions);
  }
});

test("only delimited conversation data changes across scenarios", () => {
  const built = scenarios.map((scenario) =>
    buildShouldRespondMessages(scenario.messages)
  );

  for (const messages of built) {
    // Prompt/system text is never injected into the conversation payload.
    for (const message of messages) {
      assert.equal(typeof message.content, "string");
      assert.ok(!message.content.includes("Set shouldRespond=true when"));
    }
  }

  const uniquePayloads = new Set(built.map((messages) => JSON.stringify(messages)));
  assert.ok(uniquePayloads.size > 1);
});

test("revised prompt differs from captured baseline", () => {
  assert.notEqual(checkInstructions.trim(), baselinePrompt.trim());
  assert.ok(baselinePrompt.includes("You are a message filter."));
});

test("schema is a strict boolean decision without chain-of-thought fields", () => {
  const parsed = schema.parse({ shouldRespond: true });
  assert.deepEqual(parsed, { shouldRespond: true });
  assert.throws(() => schema.parse({ shouldRespond: true, think: "nope" }));
  assert.throws(() => schema.parse({}));
});

test("scenario set covers required categories with stable IDs", () => {
  const ids = scenarios.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length);

  assert.ok(getScenariosByCategory("should-respond").length >= 13);
  assert.ok(getScenariosByCategory("should-not-respond").length >= 10);
  assert.ok(getScenariosByCategory("ambiguous").length >= 10);

  for (const scenario of scenarios) {
    assert.ok(scenario.id);
    assert.ok(Array.isArray(scenario.messages));
    assert.equal(typeof scenario.expected, "boolean");
    assert.ok(scenario.rationale);
    assert.ok(scenario.category);
    assert.ok(scenario.subcategory);
  }

  assert.ok(getScenarioById("SR-001"));
  assert.ok(getScenarioById("SN-001"));
  assert.ok(getScenarioById("AE-001"));
});

test("scenario IDs are deterministically ordered in the fixture file", () => {
  const order = scenarios.map((s) => s.id);
  assert.deepEqual(
    order,
    [
      "SR-001", "SR-002", "SR-003", "SR-004", "SR-005", "SR-006", "SR-007",
      "SR-008", "SR-009", "SR-010", "SR-011", "SR-012", "SR-013",
      "SN-001", "SN-002", "SN-003", "SN-004", "SN-005", "SN-006", "SN-007",
      "SN-008", "SN-009", "SN-010",
      "AE-001", "AE-002", "AE-003", "AE-004", "AE-005", "AE-006", "AE-007",
      "AE-008", "AE-009", "AE-010",
    ]
  );
});

test("context marks the latest text message as the unambiguous candidate", () => {
  const scenario = getScenarioById("SR-001");
  const built = buildShouldRespondMessages(scenario.messages);
  assert.equal(built.length, 2);
  assert.ok(built[1].content.startsWith(`${CANDIDATE_MARKER}\n`));
  assert.ok(!built[0].content.startsWith(`${CANDIDATE_MARKER}`));
  assert.ok(built[1].content.includes("hey Quart"));
});

test("context preserves sender and reply/quote metadata in message text", () => {
  const scenario = getScenarioById("SN-005");
  const built = buildShouldRespondMessages(scenario.messages);
  assert.ok(built[0].content.includes("quoted the following message"));
  assert.ok(built[0].content.includes("Quart said meet at 6"));
  assert.ok(built[1].content.includes("Sam that was last week"));
  assert.ok(built[1].content.startsWith(`${CANDIDATE_MARKER}\n`));
});

test("context excludes irrelevant history beyond MAX_MESSAGE_CONTEXT", () => {
  const history = [];
  for (let i = 0; i < MAX_MESSAGE_CONTEXT + 5; i++) {
    history.push({
      role: "user",
      content: `[2026-08-04T12:00:00.000Z] User${i} (mention ID: @${i}): message ${i}`,
    });
  }
  const selected = selectRecentTextMessages(history);
  const built = buildShouldRespondMessages(history);
  assert.equal(selected.length, MAX_MESSAGE_CONTEXT);
  assert.equal(built.length, MAX_MESSAGE_CONTEXT);
  assert.ok(built[0].content.includes(`message ${5}`));
  assert.ok(built.at(-1).content.includes(`message ${MAX_MESSAGE_CONTEXT + 4}`));
});

test("empty or media-only latest content yields no evaluable context", () => {
  assert.deepEqual(buildShouldRespondMessages([]), []);
  assert.deepEqual(
    buildShouldRespondMessages([{ role: "user", content: "   " }]),
    []
  );
  assert.deepEqual(
    buildShouldRespondMessages([
      { role: "user", content: [{ type: "image", image: "data:image/png;base64,abc" }] },
    ]),
    []
  );

  const emptyScenario = getScenarioById("SN-010");
  assert.deepEqual(buildShouldRespondMessages(emptyScenario.messages), []);

  const mediaScenario = getScenarioById("AE-005");
  assert.deepEqual(buildShouldRespondMessages(mediaScenario.messages), []);
});

test("parseShouldRespondOutput accepts expected positive and negative forms", () => {
  assert.equal(parseShouldRespondOutput(true), true);
  assert.equal(parseShouldRespondOutput(false), false);
  assert.equal(parseShouldRespondOutput({ shouldRespond: true }), true);
  assert.equal(parseShouldRespondOutput({ shouldRespond: false }), false);
  assert.equal(parseShouldRespondOutput(" true "), true);
  assert.equal(parseShouldRespondOutput("FALSE\n"), false);
  assert.equal(parseShouldRespondOutput("Yes"), true);
  assert.equal(parseShouldRespondOutput("no"), false);
});

test("parseShouldRespondOutput rejects malformed, empty, and verbose output", () => {
  assert.equal(parseShouldRespondOutput(null), null);
  assert.equal(parseShouldRespondOutput(undefined), null);
  assert.equal(parseShouldRespondOutput(""), null);
  assert.equal(parseShouldRespondOutput("   "), null);
  assert.equal(parseShouldRespondOutput({}), null);
  assert.equal(parseShouldRespondOutput({ shouldRespond: "maybe" }), null);
  assert.equal(
    parseShouldRespondOutput("I think Quart should respond because it is polite"),
    null
  );
  assert.equal(parseShouldRespondOutput(42), null);
});

test("assistant-authored candidate is detected for bot-loop exclusion", () => {
  const own = getScenarioById("SN-007");
  assert.equal(isAssistantAuthoredCandidate(own.messages), true);
  assert.equal(getCandidateMessage(own.messages).role, "assistant");

  const human = getScenarioById("SR-001");
  assert.equal(isAssistantAuthoredCandidate(human.messages), false);
});

test("Config exposes MAX_MESSAGE_CONTEXT for should-respond context bounds", () => {
  assert.equal(typeof MAX_MESSAGE_CONTEXT, "number");
  assert.ok(MAX_MESSAGE_CONTEXT > 0);
});

test("checkShouldRespond short-circuits deterministic exclusions without calling the model", async () => {
  const checkShouldRespond = require("../../messages/ai/CheckShouldRespond");
  let called = false;
  const model = () => {
    called = true;
    throw new Error("model should not be called");
  };
  const controller = new AbortController();

  assert.equal(await checkShouldRespond(model, null, controller), false);
  assert.equal(
    await checkShouldRespond(
      model,
      [{ role: "assistant", content: "hey! just vibing in the chat" }],
      controller
    ),
    false
  );
  assert.equal(
    await checkShouldRespond(model, [{ role: "user", content: "   " }], controller),
    false
  );
  assert.equal(
    await checkShouldRespond(
      model,
      [{ role: "user", content: [{ type: "image", image: "data:image/png;base64,abc" }] }],
      controller
    ),
    false
  );
  assert.equal(called, false);
});

test("eval harness selects baseline vs revised prompts without mutating the fixture", () => {
  const {
    resolvePromptSelection,
    selectSystemPrompt,
    loadBaselinePrompt,
  } = require("../../scripts/evaluate-should-respond");

  assert.equal(resolvePromptSelection([]).promptMode, "revised");
  assert.equal(resolvePromptSelection(["--prompt", "baseline"]).promptMode, "baseline");
  assert.equal(resolvePromptSelection(["--prompt=revised"]).promptMode, "revised");
  assert.throws(() => resolvePromptSelection(["--prompt", "other"]));

  const before = fs.readFileSync(
    path.join(__dirname, "baseline-prompt.txt"),
    "utf8"
  );

  const baseline = selectSystemPrompt("baseline");
  const revised = selectSystemPrompt("revised");

  assert.equal(baseline.promptMode, "baseline");
  assert.equal(revised.promptMode, "revised");
  assert.equal(baseline.systemPrompt.trimEnd(), before.trimEnd());
  assert.equal(revised.systemPrompt, checkInstructions);
  assert.notEqual(baseline.systemPrompt.trimEnd(), revised.systemPrompt.trimEnd());
  assert.equal(loadBaselinePrompt().trimEnd(), before.trimEnd());

  const after = fs.readFileSync(
    path.join(__dirname, "baseline-prompt.txt"),
    "utf8"
  );
  assert.equal(after, before);
});
