# Changelog

All notable changes to ArchLens are documented here.  
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).  
Versioning follows [Semantic Versioning](https://semver.org/).

---

## [3.0.0] — 2024

### Added
- **Vendor Analysis** — AI categorises all vendor/product relationships across Applications, IT Components and Interfaces into a hierarchy with cost rollup
- **Vendor Identity Resolution** — AI resolves raw vendor name variants and aliases (e.g. "MSFT", "Microsoft Corp.", "Microsoft Azure") into a canonical vendor→product→platform hierarchy
- **Functional Duplicate Detection** — AI clusters fact sheets by functional purpose and identifies candidates for consolidation
- **Modernization Assessment** — AI scores each duplicate cluster for cloud migration, consolidation and retirement opportunity
- **Architecture Intelligence** — 3-phase conversational AI that refines a business requirement through guided questions and generates a full architecture diagram using the existing technology landscape
- **Fact Sheet Intelligence** — filterable, sortable table across all fact sheet types with Bronze/Silver/Gold quality scoring
- **Real-time sync** — SSE streaming shows per-type progress bars during LeanIX sync
- **Multi-database support** — SQLite (default, zero config), MySQL, PostgreSQL
- **Multi-AI-provider support** — Anthropic Claude, OpenAI GPT-4o, DeepSeek, Google Gemini
- **Docker image** — multi-stage, multi-arch (amd64 + arm64), non-root user, health check
- **Responsive UI** — SAP Fiori Horizon design, works on desktop, tablet and mobile

### Architecture
- Node.js / Express backend with SQLite/MySQL/PostgreSQL abstraction
- React 18 frontend, built and served by Express in production
- Dynamic LeanIX schema discovery — adapts to any workspace's custom fact sheet types
- SSE streaming for long-running AI jobs (no timeouts)

---

## Unreleased

### Planned
- Configurable quality scoring profiles
- Additional EA platform connectors (Ardoq, Alfabet, CSV import)
- Helm chart for Kubernetes deployment
