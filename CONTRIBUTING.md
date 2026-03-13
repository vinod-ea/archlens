# Contributing to ArchLens

First off — thank you. ArchLens exists because enterprise architects deserve better tooling, and every contribution makes it more useful for the whole community.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How to contribute](#how-to-contribute)
- [Development setup](#development-setup)
- [Project structure](#project-structure)
- [Submitting a pull request](#submitting-a-pull-request)
- [Reporting bugs](#reporting-bugs)
- [Feature requests](#feature-requests)

---

## Code of Conduct

Be respectful. This is a professional tool used by enterprise architects. Keep discussions technical and constructive.

---

## How to contribute

| Type | How |
|------|-----|
| Bug fix | Open an issue first if it's non-trivial, then submit a PR |
| Small improvement | PR directly |
| New feature | Open a feature request issue first to align on direction |
| Documentation | PR directly |
| Docker / DevOps | PR directly |

---

## Development setup

### Prerequisites

- Node.js ≥ 18
- npm ≥ 9
- Docker (optional, for container testing)
- A LeanIX workspace with a Technical User API token (for integration testing)
- An AI API key (Anthropic, OpenAI, DeepSeek, or Google Gemini) for AI features

### Local development

```bash
# 1. Fork and clone
git clone https://github.com/YOUR_USERNAME/archlens.git
cd archlens

# 2. Install all dependencies
npm run install:all

# 3. Configure environment
cp .env.example .env
# Edit .env — at minimum add your AI_API_KEY

# 4. Start dev servers
npm run dev
# Server → http://localhost:3001
# Client → http://localhost:3000
```

### Docker development

```bash
# Build the image
npm run docker:build

# Run it
npm run docker:run
# App → http://localhost:3000
```

### Environment variables

See `.env.example` for all available options. The app runs with zero config (SQLite, no AI key needed for sync/overview features).

---

## Project structure

```
archlens/
├── server/
│   ├── index.js          # Express app, all API routes
│   ├── db/
│   │   └── db.js         # SQLite / MySQL / PostgreSQL abstraction
│   └── services/
│       ├── leanix.js     # LeanIX API client + dynamic schema discovery
│       ├── ai.js         # AI provider abstraction (Claude / OpenAI / DeepSeek)
│       ├── resolution.js # Vendor identity resolution + duplicate detection
│       └── architect.js  # 3-phase architecture conversation
│
├── client/src/
│   ├── App.js            # Root component + navigation + context
│   ├── pages/            # One file per page
│   ├── components/       # Shared components (Topbar, Drawer, etc.)
│   └── hooks/            # Shared hooks (useSSERunner, etc.)
│
├── Dockerfile
├── docker-compose.yml
└── .github/
    └── workflows/        # CI (ci.yml) + Release (release.yml)
```

---

## Submitting a pull request

1. Create a branch: `git checkout -b fix/vendor-analysis-crash` or `feat/scoring-config`
2. Make your changes
3. Test locally: `npm run dev` + manual verification
4. Test Docker: `npm run docker:build && npm run docker:run`
5. Commit with a clear message: `fix: vendor analysis SSE error when key missing`
6. Push and open a PR against `main`

### Commit message format

```
type: short description

Optional longer explanation.
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `ci`, `chore`

---

## Reporting bugs

Use the [Bug Report](.github/ISSUE_TEMPLATE/bug_report.yml) issue template. Include:
- ArchLens version (`/api/health` endpoint shows it)
- Deployment method (Docker / local Node.js)
- Steps to reproduce
- Relevant console output

**Never include API keys, LeanIX tokens, or company data in issues.**

---

## Feature requests

Use the [Feature Request](.github/ISSUE_TEMPLATE/feature_request.yml) template. The most valued features are those that:
- Address real EA workflow pain points
- Work without modifying LeanIX itself
- Can be demonstrated with a LeanIX workspace

---

## Areas especially looking for contributors

- **More EA platform connectors** — Ardoq, Alfabet, MEGA, plain CSV import
- **Configurable quality scoring** — per-organisation scoring profiles
- **Kubernetes deployment** — Helm chart, ArgoCD manifest
- **Test coverage** — integration tests against mock LeanIX responses
- **Localisation** — currently English only
