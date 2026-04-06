# AI Hollywood Studio

A fully automated AI film production platform where a single "Showrunner" orchestrates 7 AI agents through a high-level command-and-control UI to produce animated content from idea to distribution.

## Architecture

```
                              +------------------+
                              |   Next.js App    |
                              |  (App Router)    |
                              |  + tRPC API      |
                              +--------+---------+
                                       |
                  +--------------------+--------------------+
                  |                    |                    |
             PostgreSQL             Redis              S3/MinIO
             (Drizzle)           (BullMQ +            (Assets)
                                  Pub/Sub)
                                    |
               +--------------------+--------------------+
               |        |        |        |        |     |        |
            Script   Story-   Char-    Voice    Video  Edit    Market-
            Writer   board    acter    Actor    Gen    Agent   ing
               |        |        |        |        |     |        |
               +--------------------+--------------------+
                                    |
                         AI Provider Adapters
                         (Anthropic, OpenAI, Runway,
                          ElevenLabs, Stability)
```

**Modular monolith** — shared database, shared TypeScript packages, independently scalable worker processes connected via BullMQ.

### Pipeline Flow

```
Idea -> Script Writer -> [fan-out] Storyboard + Character Gen + Voice Actor
                                          |                          |
                                          +--- [fan-in: both done] --+
                                                      |
                                              Video Generator
                                                      |
                                               Editing Agent
                                                      |
                                             Marketing Agent
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js (App Router), React Flow, Tailwind CSS, Zustand, TanStack Query |
| API | tRPC v11 (end-to-end type safety) |
| Database | PostgreSQL 16, Drizzle ORM |
| Queue | BullMQ (Redis-backed job queues) |
| Realtime | Socket.io (agent progress streaming) |
| Storage | S3-compatible (MinIO local, Cloudflare R2 prod) |
| AI Providers | Anthropic Claude, OpenAI, Stability AI, ElevenLabs, Runway Gen-3 |
| Monorepo | Turborepo + pnpm workspaces |
| Auth | Auth.js v5 |
| Observability | OpenTelemetry |

## Quick Start

### Prerequisites

- Node.js 22+
- pnpm 9+
- Docker & Docker Compose

### Setup

```bash
# 1. Clone and install
pnpm install

# 2. Start infrastructure
docker compose up -d   # PostgreSQL, Redis, MinIO

# 3. Configure environment
cp .env.example .env   # Edit with your API keys (optional — mocks work without keys)

# 4. Run database migrations
pnpm db:migrate

# 5. Seed sample data
pnpm db:seed

# 6. Start development
pnpm dev               # Starts web app, worker, and realtime server
```

Or use the one-command setup script:

```bash
./scripts/dev-setup.sh
```

### Verify

```bash
./scripts/smoke-test.sh
```

Visit http://localhost:3000 to see the dashboard.

## Project Structure

```
Hollywood/
├── apps/
│   ├── web/              # Next.js frontend + tRPC API
│   ├── worker/           # BullMQ agent workers + pipeline orchestrator
│   └── realtime/         # Socket.io server for progress streaming
├── packages/
│   ├── db/               # Drizzle schema, migrations, seed
│   ├── agents/           # 7 AI agent implementations
│   ├── ai-providers/     # Pluggable AI provider adapters (mock + real)
│   ├── queue/            # BullMQ queue definitions + enqueue helpers
│   ├── trpc/             # tRPC router definitions
│   ├── storage/          # S3 upload/download utilities
│   └── types/            # Shared TypeScript types
├── docker/               # Multi-stage Dockerfiles
├── scripts/              # Dev setup + smoke test
└── .github/workflows/    # CI pipeline
```

## AI Providers

The system uses a **provider registry** with automatic detection. If an API key is set, the real provider is used; otherwise, it falls back to a mock that returns placeholder content.

| Provider | Type | Env Variable | Mock Fallback |
|----------|------|-------------|---------------|
| Anthropic Claude | Text | `ANTHROPIC_API_KEY` | Generates structured JSON scripts |
| OpenAI GPT | Text | `OPENAI_API_KEY` | Same mock |
| OpenAI DALL-E | Image | `OPENAI_API_KEY` | SVG placeholders |
| Stability AI | Image | `STABILITY_API_KEY` | SVG placeholders |
| ElevenLabs | Audio | `ELEVENLABS_API_KEY` | WAV silence buffers |
| OpenAI TTS | Audio | `OPENAI_API_KEY` | Same mock |
| Runway Gen-3 | Video | `RUNWAY_API_KEY` | JSON metadata buffers |

All providers include:
- **Cost tracking** — per-provider spend estimation
- **Rate limiting** — token-bucket per provider
- **Retry with backoff** — exponential backoff + jitter for transient failures

## Key Features

### Director's Map (Infinite Canvas)
React Flow-based canvas with custom node types for every pipeline entity. Semantic zoom (3 levels), auto-layout via dagre, real-time canvas sync via Socket.io.

### Pipeline Timeline
Visual timeline grouped by pipeline phase. Shows progress bars for active jobs, error messages for failures, and retry/cancel action buttons.

### Vibe Control Room
Sliders for pacing, color temperature, saturation, contrast, emotional intensity, and more. Art style selector (Pixar, Anime, Watercolor, etc.) with "Propagate Changes" to re-run affected pipeline stages.

### Multiverse Review
Side-by-side version comparison. Generate alternatives, compare, and "heart" the preferred version.

### Command Bar
`cmdk`-style command palette with natural language input and voice input via Web Speech API.

## Testing

```bash
pnpm test
```

81 tests covering:
- Mock provider behavior (text, image, audio, video)
- Provider registry (auto-detection, fallback, custom registration)
- Cost tracking (calculations, filtering, summaries)
- All 7 agents (validation rules)
- Pipeline orchestrator (fan-in gates, duplicate prevention)
- Full E2E pipeline (idea to marketing with mock providers)

## Docker Production Build

```bash
# Build all services
docker compose --profile app build

# Run everything
docker compose --profile app up -d
```

Multi-stage builds for `web`, `worker`, and `realtime` services. Non-root user, minimal image layers.

## CI/CD

GitHub Actions pipeline (`.github/workflows/ci.yml`):
1. **lint-type-check** — TypeScript type checking + ESLint
2. **build** — Production build of all packages
3. **db-migrate** — Migrations against PostgreSQL service container + seed

## Environment Variables

See [`.env.example`](.env.example) for all configuration options. The only required variables for local development are `DATABASE_URL` and `REDIS_URL` — the Docker Compose file provides these defaults.

## License

Private — All rights reserved.
