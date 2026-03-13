# ArchLens — EA Intelligence Platform

> AI-powered insights for your Enterprise Architecture — vendor analysis, duplicate detection, and architecture intelligence.

[![CI](https://github.com/vinod-ea/archlens/actions/workflows/ci.yml/badge.svg)](https://github.com/vinod-ea/archlens/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)

---

**LeanIX tells you what you have. ArchLens tells you what to do about it.**

ArchLens connects to your LeanIX workspace and adds an AI intelligence layer that no EA tool provides out of the box:

| Feature | What it does |
|---------|-------------|
| 🔍 **Vendor Analysis** | Categorises all vendor relationships from Application & IT Component fact sheets into a cost-aware hierarchy |
| 🏢 **Vendor Resolution** | Resolves "MSFT", "Microsoft Corp.", "Microsoft Azure" → one canonical vendor entry |
| ⊕ **Duplicate Detection** | Clusters applications by functional purpose and identifies consolidation candidates |
| ⬡ **Architecture AI** | Generates architecture diagrams from a business requirement using your existing technology landscape |
| ◈ **Overview Dashboard** | Bronze / Silver / Gold data quality distribution, cost by type, EOL and no-owner tracking |
| ☰ **Fact Sheet Intel** | Filterable, sortable table across all fact sheet types with quality scoring |

---

## Quick Start

### Option 1 — Docker (recommended)

```bash
docker run -p 3000:3000 -v archlens-data:/app/data \
  ghcr.io/vinod-ea/archlens:latest
```

Open **http://localhost:3000**

Tip: pin a release tag for reproducible deployments, e.g. `ghcr.io/vinod-ea/archlens:v3.0.0` (or `:3.0.0`).

### Option 2 — Docker Compose

```bash
curl -O https://raw.githubusercontent.com/vinod-ea/archlens/main/docker-compose.yml
curl -O https://raw.githubusercontent.com/vinod-ea/archlens/main/.env.example

cp .env.example .env      # add your AI_API_KEY

docker compose up -d
```

To pin a version:

```bash
ARCHLENS_IMAGE=ghcr.io/vinod-ea/archlens:v3.0.0 docker compose up -d
```

### Option 3 — Local Node.js

```bash
git clone https://github.com/vinod-ea/archlens.git
cd archlens

npm run install:all       # installs server + client deps
cp .env.example .env      # add your AI_API_KEY if using AI features

npm run dev               # server :3001 + React :3000
```

Open **http://localhost:3000**

---

## Connecting LeanIX

1. Click **Connect** in the navigation bar
2. Enter your workspace URL — any format works:
   - `yourcompany.leanix.net`
   - `https://yourcompany.leanix.net/WorkspaceName`
3. Enter your **Technical User API token**
   - In LeanIX: Settings → Technical Users → Add → Generate Token
4. Click **Connect & Sync** — watch live per-type progress bars

After sync, all pages work offline. Re-sync whenever you want fresh data.

---

## Configuration

Copy `.env.example` to `.env` and edit:

```env
# ── AI Provider (required for AI features) ──────────────────────────
AI_PROVIDER=claude          # claude | openai | deepseek | gemini
AI_API_KEY=sk-ant-api03-... # your API key

# ── Database (optional — SQLite is zero config default) ──────────────
DB_TYPE=sqlite              # sqlite | mysql | postgres

# ── Server ───────────────────────────────────────────────────────────
PORT=3000
```

### AI Provider Setup

| Provider | Model | Get API Key |
|----------|-------|-------------|
| **Anthropic Claude** (recommended) | claude-sonnet-4 | [console.anthropic.com](https://console.anthropic.com/settings/keys) |
| OpenAI | gpt-4o | [platform.openai.com](https://platform.openai.com/api-keys) |
| DeepSeek | deepseek-chat | [platform.deepseek.com](https://platform.deepseek.com/api_keys) |
| Google Gemini | gemini-1.5-pro | [ai.google.dev](https://ai.google.dev/gemini-api/docs/api-key) |

Sync, Overview, Fact Sheet Intel and Settings work without an AI key. AI features (Vendor Analysis, Resolution, Duplicate Detection, Architecture AI) require one.

---

## Docker Reference

### Always mount the data volume

```bash
# persist the SQLite database
docker run -p 3000:3000 \
  -v archlens-data:/app/data \
  -e AI_API_KEY=sk-ant-api03-... \
  ghcr.io/vinod-ea/archlens:latest
```

Without `-v archlens-data:/app/data` your sync data is lost when the container restarts.

### Docker Compose with PostgreSQL

```bash
docker compose -f docker-compose.yml -f docker-compose.postgres.yml up -d
```

### Health check

```
GET /api/health
→ {"ok":true,"db":"sqlite","version":"3.0.0","uptime":42}
```

---

## Architecture

```
archlens/
├── server/
│   ├── index.js          # Express API + static file serving in production
│   ├── db/db.js          # SQLite / MySQL / PostgreSQL abstraction
│   └── services/
│       ├── leanix.js     # LeanIX REST API client + schema discovery
│       ├── ai.js         # AI provider abstraction (Claude/OpenAI/DeepSeek/Gemini)
│       ├── resolution.js # Vendor resolution + duplicate detection
│       └── architect.js  # 3-phase architecture AI conversation
│
└── client/src/
    ├── App.js            # Shell + navigation + context
    ├── pages/            # One component per page
    └── components/       # Shared UI components
```

**Production** (Docker / `npm start`): Express serves the React build — single process, single port.  
**Development** (`npm run dev`): Express on `:3001`, React dev server on `:3000` with proxy.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). All contributions welcome — bug fixes, new features, documentation, and EA platform connectors.

---

## Roadmap

- [ ] Configurable quality scoring profiles
- [ ] Additional EA platform connectors (Ardoq, Alfabet, CSV import)
- [ ] Kubernetes Helm chart
- [ ] ADR coverage scoring
- [ ] Multi-user / team mode

---

## Disclaimer

ArchLens is an independent open source project. It is not affiliated with, endorsed by, or a product of LeanIX GmbH or SAP SE. "LeanIX" is a registered trademark of LeanIX GmbH. ArchLens connects to the LeanIX public API using credentials provided by the end user.

---

## License

[MIT](LICENSE)
