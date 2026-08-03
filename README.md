<img width="2000" height="1000" alt="Main Composition" src="https://github.com/user-attachments/assets/94c33748-40b9-49e8-98b8-8c4e7c60669b" />

![](https://img.shields.io/badge/build-passing-brightgreen)
![](https://img.shields.io/badge/github-repo-blue?logo=github)
[![GitHub Stars](https://img.shields.io/github/stars/cubrift/quart?style=flat&color=gold)](https://github.com/cubrift/quart/stargazers)
[![WhatsApp](https://img.shields.io/badge/Baileys-25D366?style=flat&logo=whatsapp&logoColor=white)](https://github.com/WhiskeySockets/Baileys)
[![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=flat&logo=openaigym)](https://platform.openai.com)
[![Vercel](https://img.shields.io/badge/Vercel-991412?style=flat&logo=vercel)](https://vercel.com/ai-sdk)

# Quart

Quart is an autonomous, context-aware AI chatbot for WhatsApp, built with Node.js, Baileys, and the Vercel AI SDK / OpenAI API.

Quart is designed to feel less like a command-driven bot and more like a real participant in the conversation. It can follow ongoing group chat context, understand quoted replies, react naturally, send GIFs, create polls, share locations, and keep a structured memory of conversations using SQLite.

---

# Why Quart?

Most WhatsApp bots only respond when directly prompted.

**Quart is different.**

It is built to join conversations naturally, keep track of what is going on, and behave like a genuine group member rather than a rigid automation script. The goal is to make AI communication feel lightweight, useful, and surprisingly human.

---

# Features

- **Autonomous conversation awareness:** can respond naturally when context suggests it is relevant.
- **Talk to it:** can respond with voice messages using GPT-TTS models.
- **Quoted reply support:** understands replied-to messages so context is not lost.
- **Text formatting:** can use text formatting in its messages
- **GIF integration:** searches and sends relevant GIFs using the Giphy API.
- **Poll generation:** creates interactive WhatsApp polls based on chat context or user requests.
- **Location sharing:** sends map pins and location data on demand.
- **Emoji reactions:** reacts to messages based on sentiment and context.
- **SQLite memory:** stores structured chat history locally with "better-sqlite3".
- **Tool-aware prompt flow:** maps tool calls and conversation state cleanly into the model context.
- **Lean context handling:** designed to stay efficient and cost-conscious.

---

# Tech Stack

- **Runtime:** [Node.js](https://nodejs.org) (v20+)
- **WhatsApp API:** [@whiskeysockets/baileys](https://github.com/WhiskeySockets/Baileys)
- **AI / LLM Framework:** [Vercel AI SDK](https://vercel.com/ai-sdk) / [OpenAI API](https://platform.openai.com)
- **Database:** [better-sqlite3](https://www.npmjs.com/package/better-sqlite3)
- **GIF Provider:** [Giphy API](https://developers.giphy.com)

---

# Quick Start

## Prerequisites

- Node.js v22.12.0 or higher
- A WhatsApp account
- An OpenAI API key
- A Giphy API key

## Installation

### Clone the repository:

```bash
gh repo clone cubrift/quart
cd quart
```

### Install dependencies & setup environment:

```bash
npm install
npm run setup
```

### Start Quart:

```bash
npm link
quart
```

### For more commands, run:
```bash
quart -h
```

Then follow the terminal instructions to scan the generated WhatsApp QR code. Once authenticated, session credentials will be stored locally.

---

# Contributing

Contributions of all sizes are welcome.

If you are interested in AI prompts, Node.js, WhatsApp automation, code quality, architecture, or documentation, Quart would be a great project to jump into.

Helpful contributions include:

- bug fixes
- refactors
- documentation improvements
- prompt engineering
- feature ideas
- tests
- issue triage
- performance improvements

## Good First Contributions

A few especially useful places to help:

- improve or simplify the system prompt
- clean up message handling
- split large modules into smaller, clearer pieces
- improve SQLite schema design
- add better logging and error handling
- write setup docs or examples

## Before Opening a Pull Request

Please try to:

- keep changes focused
- explain what the change does and why it helps
- include screenshots or examples where useful
- make sure the project still runs cleanly after your changes

If you find something confusing, open an issue. Clear bugs and unclear docs are both welcome contributions.

---

# Roadmap

- [x] WhatsApp conversation awareness
- [x] Quoted reply context
- [x] GIF support
- [x] Poll generation
- [x] Location sharing
- [x] Local SQLite history
- [x] Voice message support

Feel free to add to the roadmap!

---

# Deployment

Quart is lightweight enough to run on a small VPS or other always-on Linux host such as [Wispbyte](https://wispbyte.com/).

A typical deployment flow looks like this:

1. Upload or clone the repository to your server
2. Configure the environment variables
3. Install dependencies
4. Run the bot with a process manager such as PM2

Example:

```bash
npm install -g pm2
pm2 start index.js --name quart-bot
pm2 save
```

Make sure your host keeps the process alive and has persistent storage available for session data and SQLite files.

---

# Notes

Quart is actively evolving, so the codebase may change quickly as features are added and the architecture improves. If something looks rough, that is usually a sign that there is room for a good contribution.

---

Made with ❤ by David Skillman
