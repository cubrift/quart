#!/usr/bin/env node
/**
 * Should-respond evaluation harness.
 *
 * Offline (no API calls):
 *   npm run eval:should-respond
 *   npm run eval:should-respond -- --prompt baseline
 *   npm run eval:should-respond -- --prompt revised
 *
 * Live model evaluation (requires OPENAI_API_KEY; incurs usage):
 *   OPENAI_API_KEY=... npm run eval:should-respond -- --prompt baseline
 *   OPENAI_API_KEY=... npm run eval:should-respond -- --prompt revised
 *
 * Both prompt modes use the same 33 scenarios, CHECK_MODEL, temperature 0,
 * context construction, and schema. Only the system prompt text differs.
 * The baseline prompt fixture is never written/mutated.
 *
 * Model output is not guaranteed deterministic even with temperature 0:
 * @ai-sdk/openai Responses models do not support seed.
 */

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const { CHECK_MODEL } = require("../Config");
const { checkInstructions } = require("../messages/ai/SystemInstructions");
const schema = require("../messages/ai/schemas/CheckShouldRespondSchema");
const {
  buildShouldRespondMessages,
  isAssistantAuthoredCandidate,
  parseShouldRespondOutput,
} = require("../messages/ai/ShouldRespondContext");
const { scenarios } = require("../test/should-respond/scenarios");

const BASELINE_PROMPT_PATH = path.join(
  __dirname,
  "..",
  "test",
  "should-respond",
  "baseline-prompt.txt"
);

function sha256(text) {
  return crypto.createHash("sha256").update(text).digest("hex").slice(0, 12);
}

function loadBaselinePrompt() {
  return fs.readFileSync(BASELINE_PROMPT_PATH, "utf8").trimEnd() + "\n";
}

function resolvePromptSelection(argv = process.argv.slice(2)) {
  let promptMode = "revised";
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--prompt") {
      const value = argv[i + 1];
      if (!value || value.startsWith("-")) {
        throw new Error("Missing value for --prompt (expected baseline|revised)");
      }
      promptMode = value;
      i += 1;
      continue;
    }
    if (arg.startsWith("--prompt=")) {
      promptMode = arg.slice("--prompt=".length);
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      return { promptMode: "help" };
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (promptMode !== "baseline" && promptMode !== "revised") {
    throw new Error(`Invalid --prompt value "${promptMode}" (expected baseline|revised)`);
  }

  return { promptMode };
}

function selectSystemPrompt(promptMode) {
  if (promptMode === "baseline") {
    const text = loadBaselinePrompt().trimEnd();
    return {
      promptMode,
      systemPrompt: text,
      source: "test/should-respond/baseline-prompt.txt",
      immutableFixture: true,
    };
  }

  return {
    promptMode: "revised",
    systemPrompt: checkInstructions,
    source: "messages/ai/SystemInstructions.js#checkInstructions",
    immutableFixture: false,
  };
}

function classifyOffline(scenario) {
  if (isAssistantAuthoredCandidate(scenario.messages)) {
    return { decision: false, source: "deterministic:assistant-authored" };
  }
  const context = buildShouldRespondMessages(scenario.messages);
  if (context.length === 0) {
    return { decision: false, source: "deterministic:no-evaluable-text" };
  }
  return { decision: null, source: "requires-model" };
}

function printOfflineReport(promptInfo) {
  const baselineText = loadBaselinePrompt().trimEnd();
  const revisedText = checkInstructions.trimEnd();

  console.log("Should-respond evaluation (offline harness)");
  console.log("==========================================");
  console.log(`Prompt mode: ${promptInfo.promptMode}`);
  console.log(`Prompt source: ${promptInfo.source}`);
  console.log(`Prompt sha256[:12]: ${sha256(promptInfo.systemPrompt.trimEnd())}`);
  console.log(`Prompt length: ${promptInfo.systemPrompt.length} chars`);
  console.log(`Scenarios: ${scenarios.length}`);
  console.log(`CHECK_MODEL: ${CHECK_MODEL}`);
  console.log("Model settings: temperature=0 (seed unsupported on OpenAI Responses path)");
  console.log("");
  console.log("Offline mode does NOT measure prompt quality / FP / FN / accuracy.");
  console.log("It validates scenario integrity, deterministic exclusions, and prompt selection.");
  console.log("Live same-model before/after results require OPENAI_API_KEY.");
  console.log("");

  // Readiness proof for both modes without mutating fixtures or SystemInstructions.
  const baselineInfo = selectSystemPrompt("baseline");
  const revisedInfo = selectSystemPrompt("revised");
  console.log("Prompt readiness (no file mutation):");
  console.log(
    `  baseline: ok sha=${sha256(baselineInfo.systemPrompt.trimEnd())} len=${baselineInfo.systemPrompt.length}`
  );
  console.log(
    `  revised:  ok sha=${sha256(revisedInfo.systemPrompt.trimEnd())} len=${revisedInfo.systemPrompt.length}`
  );
  console.log(
    `  prompts_differ: ${baselineInfo.systemPrompt.trimEnd() !== revisedInfo.systemPrompt.trimEnd()}`
  );
  console.log(
    `  baseline_matches_fixture_file: ${baselineInfo.systemPrompt.trimEnd() === baselineText}`
  );
  console.log(
    `  revised_matches_SystemInstructions: ${revisedInfo.systemPrompt.trimEnd() === revisedText}`
  );
  console.log("");

  const rows = scenarios.map((scenario) => {
    const offline = classifyOffline(scenario);
    return {
      id: scenario.id,
      expected: scenario.expected,
      offlineDecision: offline.decision,
      source: offline.source,
      category: scenario.category,
      subcategory: scenario.subcategory,
    };
  });

  console.log("id\texpected\toffline\tsource\tcategory/subcategory");
  for (const row of rows) {
    const offline =
      row.offlineDecision == null ? "n/a-model" : String(row.offlineDecision);
    console.log(
      `${row.id}\t${row.expected}\t${offline}\t${row.source}\t${row.category}/${row.subcategory}`
    );
  }

  const deterministic = rows.filter((r) => r.offlineDecision != null);
  console.log("");
  console.log(
    `Deterministic pre-model exclusions: ${deterministic.length} of ${rows.length} scenarios`
  );
  console.log(
    "These exclusions test plumbing only; they are not evidence the revised prompt is better."
  );
  console.log(
    `Model-required scenarios (live benchmark): ${rows.length - deterministic.length}`
  );

  return rows;
}

function summarizeResults(results, promptInfo) {
  let tp = 0;
  let tn = 0;
  let fp = 0;
  let fn = 0;
  let unknown = 0;

  console.log("");
  console.log(
    `Live results for --prompt ${promptInfo.promptMode} (model=${CHECK_MODEL}, temperature=0)`
  );
  console.log("id\texpected\tdecision\tresult\tsource");
  for (const row of results) {
    let verdict = "unknown";
    if (row.decision == null) {
      unknown += 1;
    } else if (row.expected && row.decision) {
      tp += 1;
      verdict = "TP";
    } else if (!row.expected && !row.decision) {
      tn += 1;
      verdict = "TN";
    } else if (!row.expected && row.decision) {
      fp += 1;
      verdict = "FP";
    } else {
      fn += 1;
      verdict = "FN";
    }
    console.log(
      `${row.id}\t${row.expected}\t${row.decision}\t${verdict}\t${row.source}`
    );
  }

  console.log("");
  console.log(`TP=${tp} TN=${tn} FP=${fp} FN=${fn} unknown=${unknown}`);
  console.log(
    "Compare baseline vs revised with the same key/model/settings before claiming FP/FN improvement."
  );
  console.log(
    "Small scenario sets are regression evidence only; model output may still vary without seed support."
  );

  return { tp, tn, fp, fn, unknown };
}

async function runLiveEvaluation(promptInfo) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    console.log("");
    console.log("OPENAI_API_KEY not set — skipping live model evaluation.");
    console.log(
      "Both --prompt baseline and --prompt revised are ready; live behavioral benchmarking remains blocked."
    );
    return null;
  }

  const { createOpenAI } = require("@ai-sdk/openai");
  const { generateText, Output } = require("ai");
  const model = createOpenAI({ apiKey });

  console.log("");
  console.log(
    `Live evaluation: prompt=${promptInfo.promptMode} model=${CHECK_MODEL} temperature=0 seed=unsupported`
  );

  const results = [];
  for (const scenario of scenarios) {
    if (isAssistantAuthoredCandidate(scenario.messages)) {
      results.push({
        id: scenario.id,
        expected: scenario.expected,
        decision: false,
        source: "deterministic:assistant-authored",
      });
      continue;
    }

    const contextMessages = buildShouldRespondMessages(scenario.messages);
    if (contextMessages.length === 0) {
      results.push({
        id: scenario.id,
        expected: scenario.expected,
        decision: false,
        source: "deterministic:no-evaluable-text",
      });
      continue;
    }

    try {
      const { _output } = await generateText({
        model: model(CHECK_MODEL),
        output: Output.object({ schema }),
        system: promptInfo.systemPrompt,
        temperature: 0,
        messages: contextMessages,
      });
      const decision = parseShouldRespondOutput(_output);
      results.push({
        id: scenario.id,
        expected: scenario.expected,
        decision,
        source: decision == null ? "model:unparseable" : "model",
      });
    } catch (error) {
      results.push({
        id: scenario.id,
        expected: scenario.expected,
        decision: null,
        source: `model-error:${error.name || "Error"}`,
      });
    }
  }

  summarizeResults(results, promptInfo);
  return results;
}

function printHelp() {
  console.log(`Usage:
  npm run eval:should-respond -- [--prompt baseline|revised]

Offline always runs. Live model evaluation runs only when OPENAI_API_KEY is set.

Both prompt modes share scenarios, model, temperature=0, context builder, and schema.
Only the system prompt text changes. baseline-prompt.txt is never modified.`);
}

async function main(argv = process.argv.slice(2)) {
  const { promptMode } = resolvePromptSelection(argv);
  if (promptMode === "help") {
    printHelp();
    return;
  }

  const promptInfo = selectSystemPrompt(promptMode);
  printOfflineReport(promptInfo);
  await runLiveEvaluation(promptInfo);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = {
  classifyOffline,
  printOfflineReport,
  runLiveEvaluation,
  resolvePromptSelection,
  selectSystemPrompt,
  loadBaselinePrompt,
  main,
};
