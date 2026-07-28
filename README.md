<img height="216" alt="Quart Banner" src="https://github.com/user-attachments/assets/b83c173a-fd66-47eb-871e-3d0d77f2b860" />""Build" (https://img.shields.io/badge/build-passing-brightgreen)"
""GitHub Stars" (https://img.shields.io/github/stars/cubrift/quart?style=flat&color=gold)" (https://github.com/cubrift/quart/stargazers)
""GitHub Repo" (https://img.shields.io/badge/github-repo-blue?logo=github)" (https://github.com/cubrift/quart)
""WhatsApp" (https://img.shields.io/badge/Baileys-25D366?style=flat&logo=whatsapp&logoColor=white)" (https://github.com/WhiskeySockets/Baileys)
""OpenAI" (https://img.shields.io/badge/OpenAI-412991?style=flat&logo=openai&logoColor=white)" (https://platform.openai.com)
""Vercel AI SDK" (https://img.shields.io/badge/Vercel%20AI%20SDK-000000?style=flat&logo=vercel&logoColor=white)" (https://vercel.com/ai-sdk)

Quart

Quart is an autonomous, context-aware AI chatbot for WhatsApp, built with Node.js, Baileys, and the Vercel AI SDK / OpenAI API.

Quart is designed to feel less like a command-driven bot and more like a real participant in the conversation. It can follow ongoing group chat context, understand quoted replies, react naturally, send GIFs, create polls, share locations, and keep a structured memory of conversations using SQLite.

---

Why Quart?

Most WhatsApp bots only respond when directly prompted.

Quart is different.

It is built to join conversations naturally, keep track of what is going on, and behave like a genuine group member rather than a rigid automation script. The goal is to make AI communication feel lightweight, useful, and surprisingly human.

---

Features

- Autonomous conversation awareness — can respond naturally when context suggests it is relevant.
- Quoted reply support — understands replied-to messages so context is not lost.
- GIF integration — searches and sends relevant GIFs using the Giphy API.
- Poll generation — creates interactive WhatsApp polls based on chat context or user requests.
- Location sharing — sends map pins and location data on demand.
- Emoji reactions — reacts to messages based on sentiment and context.
- SQLite memory — stores structured chat history locally with "better-sqlite3".
- Tool-aware prompt flow — maps tool calls and conversation state cleanly into the model context.
- Lean context handling — designed to stay efficient and cost-conscious.

---

Tech Stack

- Runtime: "Node.js" (https://nodejs.org) (v20+)
- WhatsApp API: "@whiskeysockets/baileys" (https://github.com/WhiskeySockets/Baileys)
- AI / LLM Framework: "Vercel AI SDK" (https://vercel.com/ai-sdk) / "OpenAI API" (https://platform.openai.com)
- Database: "better-sqlite3" (https://www.npmjs.com/package/better-sqlite3)
- GIF Provider: "Giphy API" (https://developers.giphy.com)

---

Project Structure

quart/
├── database/
├── ai/
├── tools/
├── handlers/
├── prompts/
├── index.js
└── .env

---

Quick Start

Prerequisites

- Node.js v20 or higher
- A WhatsApp account for pairing
- An OpenAI API key
- A Giphy API key
- A phone number entered in international format, without symbols

Installation

Clone the repository:

gh repo clone cubrift/quart
cd quart

Install dependencies:

npm install

Create a ".env" file in the project root and add your environment variables:

PHONE_NUMBER=445296151350
OPEN_API_KEY=your_openai_api_key_here
GIPHY_API_KEY=your_giphy_api_key_here

Start Quart:

node index.js

Then follow the terminal instructions to scan the generated WhatsApp QR code or use the pairing flow. Once authenticated, session credentials will be stored locally.

---

Environment Variables

Variable| Required| Purpose
"PHONE_NUMBER"| Yes| The phone number used for WhatsApp pairing
"OPEN_API_KEY"| Yes| Used for model responses
"GIPHY_API_KEY"| Yes| Used for GIF search

---

Contributing

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

Good First Contributions

A few especially useful places to help:

- improve or simplify the system prompt
- clean up message handling
- split large modules into smaller, clearer pieces
- improve SQLite schema design
- add better logging and error handling
- write setup docs or examples

Before Opening a Pull Request

Please try to:

- keep changes focused
- explain what the change does and why it helps
- include screenshots or examples where useful
- make sure the project still runs cleanly after your changes

If you find something confusing, open an issue. Clear bugs and unclear docs are both welcome contributions.

---

Roadmap

- [x] WhatsApp conversation awareness
- [x] Quoted reply context
- [x] GIF support
- [x] Poll generation
- [x] Location sharing
- [x] Local SQLite history
- [ ] Voice message support
- [ ] Plugin system
- [ ] Better long-term memory
- [ ] Web dashboard
- [ ] Cleaner modular architecture
- [ ] More contributor-friendly tooling

---

Deployment

Quart is lightweight enough to run on a small VPS or other always-on Linux host.

A typical deployment flow looks like this:

1. Upload or clone the repository to your server
2. Configure the environment variables
3. Install dependencies
4. Run the bot with a process manager such as PM2

Example:

npm install -g pm2
pm2 start index.js --name quart-bot
pm2 save

Make sure your host keeps the process alive and has persistent storage available for session data and SQLite files.

---

Notes

Quart is actively evolving, so the codebase may change quickly as features are added and the architecture improves. If something looks rough, that is usually a sign that there is room for a good contribution.

---

License

Add your chosen licence here.

---

Made with ❤ by David Skillman