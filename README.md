# BizChat

**An AI customer-service chatbot for small businesses: instant answers from a keyword knowledge base, a Gemini fallback for everything else, and a human escalation queue so no question is lost.**

![node](https://img.shields.io/badge/node-%E2%89%A518-339933?logo=node.js&logoColor=white)
![express](https://img.shields.io/badge/Express-000000?logo=express)
![gemini](https://img.shields.io/badge/Gemini-2.5%20Flash-4285F4?logo=googlegemini&logoColor=white)
![license](https://img.shields.io/badge/license-MIT-blue)

Small shops (retail, F&B, services) get the same handful of questions all day: opening hours, prices, promos, how to order, delivery. BizChat answers those instantly and costs nothing per message. It only calls an LLM when needed, and hands over to staff when it isn't sure. The bot and admin panel are in Bahasa Indonesia, built for Indonesian SMEs (UMKM).

## How a message is answered

```
customer message
      │
      ▼
 1. keyword knowledge base ──match──▶ answer instantly (free, deterministic)
      │ no match
      ▼
 2. Gemini 2.5 Flash ──confident──▶ AI answer, restricted to shop topics
      │ off-topic / unsure ("ESCALATE") / no API key
      ▼
 3. escalation queue ──▶ shown on the staff dashboard for a human reply
```

Every step is counted, so the dashboard shows how much traffic the knowledge base absorbs, how much needs AI, and how much needs a person.

## Features

- **Embeddable chat widget** with quick-reply chips, previewed on a mock shop page
- **Knowledge base editor:** add and delete keyword → answer pairs from the UI, with hit counts per entry
- **Dashboard:** total questions, a breakdown by KB / AI / escalated, the most-asked topics, and the escalation queue
- **Guard-railed LLM fallback:** the system prompt limits Gemini to shop topics in up to three sentences, and it returns a sentinel instead of guessing
- **Works with no API key:** without one, unmatched questions go straight to staff, so the app is fully usable offline

## Run it

```bash
git clone https://github.com/affifariza04/bizchat && cd bizchat
npm install
npm start            # http://localhost:3000
```

To enable the AI fallback, copy `.env.example` to `.env` and set `GEMINI_API_KEY` (free key at https://aistudio.google.com/apikey). The sidebar shows **AI fallback: aktif** when the key is loaded.

### Adapting it to a business

Edit `data/kb.json` or use the **Knowledge Base** page:

```json
{ "key": "garansi", "answer": "Produk kami bergaransi 7 hari untuk kerusakan pabrik." }
```

### Deploy

It runs on any Node host. On Render, for example: New → Web Service → this repo, build command `npm install`, start command `npm start`, and optionally set `GEMINI_API_KEY`.

## API

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/chat` | `{ message }` → `{ source: "kb" \| "ai" \| "escalate", answer }` |
| `GET` / `POST` | `/api/kb` | List or add knowledge-base entries |
| `DELETE` | `/api/kb/:index` | Remove an entry |
| `GET` | `/api/stats` | Usage counters |
| `GET` | `/api/escalations` | Questions waiting for staff |
| `GET` | `/api/status` | Whether the AI fallback is enabled |

## Project layout

```
server.js        Express API + static hosting, KB → Gemini → escalation pipeline
public/          admin panel and chat widget (vanilla HTML/CSS/JS)
data/            JSON storage: knowledge base, stats, escalation queue
```

## Security notes

- The Gemini key is sent in the `x-goog-api-key` header, never in the URL, so it doesn't end up in proxy logs.
- Customer messages are escaped before rendering in the staff dashboard (prevents stored XSS from chat input).
- `.env` is git-ignored.

## Limitations and roadmap

- **No admin login yet.** The dashboard and knowledge-base editor must not be exposed publicly as-is. Next step: session auth for staff.
- **JSON-file storage** is fine for one small shop. Multiple shops or heavy traffic need a database (SQLite or Postgres).
- **Substring keyword matching** can misfire on short keys. Semantic matching with embeddings is the natural upgrade (see [ragkit](https://github.com/affifariza04/ragkit)).
- Replying to escalations from inside the dashboard, and WhatsApp integration.

MIT licensed.
