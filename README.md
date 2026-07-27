<img height="216" alt="QuartBanner" src="https://github.com/user-attachments/assets/b83c173a-fd66-47eb-871e-3d0d77f2b860" />

![](https://img.shields.io/badge/build-passing-brightgreen)
![](https://img.shields.io/badge/github-repo-blue?logo=github)
[![GitHub Stars](https://img.shields.io/github/stars/cubrift/quart?style=flat&color=gold)](https://github.com/cubrift/quart/stargazers)
[![WhatsApp](https://img.shields.io/badge/Baileys-25D366?style=flat&logo=whatsapp&logoColor=white)](https://github.com/WhiskeySockets/Baileys)
[![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=flat&logo=openaigym)](https://platform.openai.com)
[![Vercel](https://img.shields.io/badge/Vercel-991412?style=flat&logo=vercel)](https://vercel.com/ai-sdk)

# Quart

**Quart** is an autonomous, context-aware AI chatbot for WhatsApp built with **Node.js**, **Baileys**, and the **Vercel AI SDK / OpenAI API**.

Designed to feel like a real participant in group chats and direct messages, Quart doesn't just reply when prompted! It supports multi-media interactions, understands quoted replies, tracks structured message history via SQLite, and can join conversations when it is mentioned when it "feels" like it.

---

## Features

- **Autonomous & Spontaneous Engagement**: Responds naturally in conversations and occasionally comes in when relevant.
- **GIF Integration**: Automatically searches and sends (somewhat) relevant GIFs powered by the Giphy API.
- **Poll Generation**: Creates interactive WhatsApp polls based on chat context or requests.
- **Map & Location Sharing**: Shares map pins and location data on demand.
- **Message Reactions**: Reacts to user messages with emojis based on sentiment and context.
- **Quoted Reply Context**: Remembers and understands quoted/replied messages so context is never lost.
- **SQLite Chat History**: Efficient, local chat memory persistence with SQLite (`better-sqlite3`), mapping tool calls seamlessly for prompt tracking.
- **Optimized Context Window**: Lightweight message handling structured to work efficiently with low-cost model configurations.

---

## Tech Stack

- **Runtime**: [Node.js](https://nodejs.org) (v24+)
- **WhatsApp API**: [@whiskeysockets/baileys](https://github.com/WhiskeySockets/Baileys)
- **AI / LLM Framework**: [Vercel AI SDK](https://vercel.com/ai-sdk/) / [OpenAI API](https://platform.openai.com)
- **Database**: [better-sqlite3](https://www.npmjs.com/package/better-sqlite3)
- **GIF Provider**: [Giphy API](https://developers.giphy.com)

---

## Environment Variables

Create a `.env` file in the root directory of your project and configure the required keys:

```env
# Required for OpenAI API model responses
OPEN_API_KEY=your_openai_api_key_here

# Required for fetching GIFs from Giphy
GIPHY_API_KEY=your_giphy_api_key_here
```

---

## Getting Started

### Prerequisites
- Node.js v24.0.0 or higher installed.
- An active WhatsApp account to enter the pairing code.
- An OPEN_API_KEY and a GIPHY_API_KEY both defined inside the environment variables or the `.env` file

### Installation

#### Clone the repository:

```bash
gh repo clone cubrift/quart
cd quart
```

#### Install dependencies:

```bash
npm install
```

Configure environment variables:
Create a .env file and fill in `OPEN_API_KEY` and `GIPHY_API_KEY`.

#### Run Quart:

```Bash
node index.js
```

#### Authenticate:
Follow the terminal instructions to scan the generated WhatsApp QR/pairing code with your phone. Once authenticated, session credentials will be stored locally.

---

## Deployment
Quart is designed to be lightweight and server-friendly. You can run it continuously on any Linux VPS or free hosting platforms such as [Wispbyte](https://wispbyte.com):
- Upload/clone the repository to your host server.
- Set your environment variables in the host control panel or .env.

Start the process using a process manager like PM2 to ensure automatic restarts:
```bash
npm install -g pm2
pm2 start index.js --name "quart-bot"
pm2 save
```

---

## Contributing & Prompt Engineering
Contributions are extremely welcome—especially around system instruction engineering!

### System Prompt Optimization
The current challenge is balancing low token costs against strict instruction adherence:
- Token Efficiency: We want system instructions that maximize OpenAI Prompt Caching benefits (reusing static prefix context across requests to trigger 50%+ discount on input tokens).
- Instruction Quality: Ensuring Quart strictly obeys persona rules, tool triggering criteria, and output limits without bloating prompt length.

If you have experience crafting concise, high-density system prompts or optimizing LLM context structures for prompt caching, please open a Pull Request or Issue!

---

Made with ❤ by David Skillman
