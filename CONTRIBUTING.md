# Contributing to Quart

Thanks for your interest in Quart!

Quart is an evolving project, and contributions of all sizes are genuinely appreciated. As Cubrift, an individual programmer, contributions are extremely helpful. Whether that is a bug fix, a refactor, a documentation tweak, a new feature, or a better prompt.

This guide should help you get started.

---

# Before you begin

### Please take a moment to:

- read the README
- check existing issues and pull requests
- open an issue if the change is large or unclear
- keep contributions focused and easy to review

If something is confusing, that is a great thing to turn into an issue. Good documentation and clear bug reports help just as much as code.

---

# Ways to contribute

You can help Quart by contributing any of the following:

- bug fixes
- refactors
- performance improvements
- better error handling
- clearer documentation
- prompt engineering improvements
- new features
- tests
- issue triage
- code cleanup and modularisation

Even small improvements are valuable.

---

# Getting started

1) Fork and clone the repository

```bash
gh repo fork cubrift/quart --clone
cd quart
```

If you prefer, you can also clone your fork manually.

2) Install dependencies

npm install

3) Set up environment variables

Create a `.env` file in the project root and add the required values.

```bash
PHONE_NUMBER=your_phone_number_here
OPEN_API_KEY=your_openai_api_key_here
GIPHY_API_KEY=your_giphy_api_key_here
```

Never commit secret keys, tokens, session files, or private credentials.

4) Run Quart locally

```bash
node index.js
```

Follow the terminal prompts to authenticate with WhatsApp.

---

# Recommended workflow

For the smoothest pull request, please:

1. choose a small issue or improvement
2. check whether someone else is already working on it
3. make one change at a time
4. test your changes locally
5. describe the change clearly in the pull request

If a feature is bigger than a small fix, it helps to open an issue first so the direction can be discussed.

---

# Coding style

Quart is still growing, so consistency matters a lot.

Please try to:

- keep code readable and simple
- split large functions into smaller ones when appropriate
- reuse existing patterns where possible
- add comments only where the logic is not obvious
- avoid unrelated formatting-only changes in the same PR
- keep naming clear and consistent
- don't mix spaces with tabs and tabs with spaces 😅

If you are improving prompt logic, aim for:

- concise instructions
- stable behaviour
- minimal token waste
- clear separation between system behaviour and runtime data

---

# Prompt engineering contributions

Prompt work is especially welcome.

Useful prompt-related improvements include:

- clearer system instructions
- stronger tool-use rules
- better message-length control
- more reliable persona consistency
- improved context handling
- lower-token prompt structure
- safer fallback behaviour
- more maintainable prompt organisation

When changing prompts, please include:

- what behaviour changed
- why the change was needed
- any trade-offs or side effects you noticed

Prompt changes are easiest to review when the reasoning is short and concrete.

---

# Issues

Before opening a new issue, please check whether it already exists.

A good issue should include:

- what happened
- what you expected instead
- steps to reproduce
- any relevant logs or screenshots
- your environment if it matters

Good issues save a lot of time for everyone!

---

# Pull requests

A good pull request should be:

- focused on one topic
- easy to understand
- tested where possible
- described clearly

Please include:

- a short summary of the change
- why it was needed
- any setup or testing notes
- screenshots or examples if relevant

If your PR changes behaviour, it is helpful to mention before/after behaviour too.

---

# Testing

If you add or change behaviour, please test it as thoroughly as you reasonably can.

At minimum, check that:

- the app starts successfully
- WhatsApp authentication still works
- the relevant feature behaves as expected
- no obvious runtime errors were introduced

If tests exist for the area you are changing, please update them as needed.

---

# Documentation

Documentation contributions are always welcome.

Helpful docs work includes:

- clarifying setup steps
- adding examples
- explaining configuration
- documenting architecture
- improving the contributor workflow
- adding notes for common mistakes

If you are fixing something that tripped you up, chances are someone else will benefit from that note too.

---

# Good first contributions

Some good starter contributions might be:

- fixing a typo or broken link
- improving README clarity
- tightening one prompt section
- cleaning up one module
- improving logging
- making an error message clearer
- adding a small test or example

These are great places to begin.

---

# What to avoid

Please avoid:

- giant PRs that mix many unrelated changes
- committing secrets or session data
- changing code style everywhere without a reason
- introducing breaking changes without explanation
- rewriting whole parts of the project unless the change is well discussed first

---

# Code of conduct

Be respectful, clear, and kind.

Quart is meant to be a fun and useful project, and contributors should feel welcome. If you disagree with a technical decision, keep it constructive and specific.

---

# Need help?

If you are stuck, open an issue and explain what is happening. A clear question is usually enough to get things moving.

**Thanks again for helping build Quart!**