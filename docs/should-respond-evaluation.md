# Should-respond evaluation

This document describes Quart's static **should-respond** prompt, output contract, and offline/live evaluation harness for [issue #2](https://github.com/cubrift/quart/issues/2).

## Decision criteria (static prompt)

The system prompt lives in `messages/ai/SystemInstructions.js` as `checkInstructions`.

It is a **static** string: it does not change with chat state, sender, or scenario. Dynamic content is supplied only as chronologically ordered conversation messages. The latest evaluable text message is marked with a fixed `[CANDIDATE]` delimiter by `messages/ai/ShouldRespondContext.js`.

**Respond when** Quart is invited (directly/indirectly), the message addresses the room, or a human participant could naturally join (open statements/questions, announcements, jokes, personal events, news/updates).

**Do not respond when** the message is private banter between others, a mention is only quoted/stale, content is fragmentary, Quart authored it / a bot loop would occur, the AI is asked not to respond, or there is no natural contribution.

The prompt explicitly rejects treating “respond naturally” as “respond to every message.”

## Output format

`messages/ai/schemas/CheckShouldRespondSchema.js` expects:

```json
{ "shouldRespond": true }
```

or

```json
{ "shouldRespond": false }
```

No chain-of-thought field is requested. `parseShouldRespondOutput` also tolerates lone `true`/`false` tokens for tests and defensive parsing; malformed/empty/verbose output yields no decision (treated as do-not-respond).

## Benchmark scenario categories

Shared fixture: `test/should-respond/scenarios.js` (33 scenarios)

| Category | ID prefix | Intent |
| --- | --- | --- |
| should-respond | `SR-*` | Mentions, room-wide asks, open statements, announcements, jokes, updates, follow-ups |
| should-not-respond | `SN-*` | Banter, named-person asks, acknowledgements, fragments, quoted/stale mentions, system noise, own messages, empty content |
| ambiguous | `AE-*` | Rhetorical/sarcasm, vague solicits, reply-without-mention, media-only, quoted mentions, “don't ask the AI”, discussing Quart |

Immutable baseline prompt fixture: `test/should-respond/baseline-prompt.txt`  
SHA-256 prefix: `3d9c117dfa69`

Accepted revised prompt: `messages/ai/SystemInstructions.js` (`checkInstructions`)  
SHA-256 prefix: `cb9a02ea259d`

A later experimental prompt revision was evaluated and **rejected**. It is **not** part of this PR. Prompt iteration was benchmark-driven; the accepted revision remains `cb9a02ea259d`.

## Live benchmark results

Same 33 scenarios, three live runs per prompt, identical plumbing:

- model: `gpt-4.1-nano` (`CHECK_MODEL`)
- temperature: `0`
- seed: unsupported on the OpenAI Responses provider path
- same context builder
- same boolean schema

### Baseline (`3d9c117dfa69`)

| Run | TP | TN | FP | FN |
| --- | --- | --- | --- | --- |
| 1 | 12 | 14 | 4 | 3 |
| 2 | 11 | 14 | 4 | 4 |
| 3 | 11 | 13 | 5 | 4 |
| **Aggregate** | **34** | **41** | **13** | **11** |

- correct = 75/99
- accuracy = 75.8%
- false-positive rate = 13/54 = 24.1%
- false-negative rate = 11/45 = 24.4%

### Revised — accepted (`cb9a02ea259d`)

| Run | TP | TN | FP | FN |
| --- | --- | --- | --- | --- |
| 1 | 10 | 16 | 2 | 5 |
| 2 | 12 | 17 | 1 | 3 |
| 3 | 11 | 16 | 2 | 4 |
| **Aggregate** | **33** | **49** | **5** | **12** |

- correct = 82/99
- accuracy = 82.8%
- false-positive rate = 5/54 = 9.3%
- false-negative rate = 12/45 = 26.7%

### Summary

- Overall accuracy improved from **75.8%** to **82.8%**.
- False positives dropped from **13** to **5** across the three runs.
- False-positive rate dropped from **24.1%** to **9.3%**.
- False negatives increased slightly from **11** to **12**.
- The main measured gain is substantially lower false-positive behavior, not universal improvement on every scenario.
- Model output remains nondeterministic because seed is unsupported.
- This is a small regression benchmark and should not be presented as universal model-quality evidence.

## Reproduction

```bash
# Focused deterministic tests
npm run test:should-respond

# Offline evaluation (no API calls) — revised prompt selected by default
npm run eval:should-respond
npm run eval:should-respond -- --prompt revised
npm run eval:should-respond -- --prompt baseline

# Live same-model before/after (incurs OpenAI usage)
OPENAI_API_KEY=... npm run eval:should-respond -- --prompt baseline
OPENAI_API_KEY=... npm run eval:should-respond -- --prompt revised

# Full test suite
npm test
```

Both `--prompt` modes use the same 33 scenarios, `CHECK_MODEL`, `temperature: 0`, context builder, and boolean schema. Only the system prompt string differs. The baseline fixture is never written or mutated.

## Limitations

- Offline mode validates scenario integrity, deterministic exclusions, static prompt selection, context construction, and parsing. It does **not** by itself measure false-positive/false-negative/accuracy improvement.
- Live same-model baseline vs revised results above are the source for measured FP/FN/accuracy claims in this PR.
- Live mode requires an OpenAI API key and incurs model usage. The 33-scenario set is regression evidence, not universal proof of model quality.
- Default `createOpenAI()(CHECK_MODEL)` uses the OpenAI **Responses** provider path (`openai.responses`). That path accepts `temperature` for non-reasoning models but marks **`seed` as unsupported**. Model output is therefore not guaranteed deterministic even at `temperature: 0`.
- WhatsApp `@` mention bypass in `MessageAI.js` still short-circuits the model for direct JID mentions; text-level “Quart” / nickname cases still use this prompt.
