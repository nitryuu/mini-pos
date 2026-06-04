# Mini POS

A Point of Sale REST API built with Bun, Hono, PostgreSQL, Drizzle ORM, WebSockets, and Redis.

## Tech Stack

- **Runtime** — [Bun](https://bun.sh)
- **Framework** — [Hono](https://hono.dev)
- **Database** — PostgreSQL + [Drizzle ORM](https://orm.drizzle.team)
- **Cache / Queue** — Redis + [BullMQ](https://bullmq.io)
- **Auth** — JWT (access token + refresh token rotation)
- **Testing** — Vitest + Testcontainers
- **Real-time** — WebSockets + SSE

## Features

- 🔐 **Auth** — register, login, refresh token rotation, logout
- 👥 **RBAC** — admin and cashier roles
- 📦 **Products** — CRUD with image upload and stock management
- 🛒 **Orders** — create and update orders with automatic stock deduction
- 👤 **Buyers** — manage buyer information
- 👨‍💼 **Users** — user management (admin only)
- 💳 **Payments** — cash or transfer
- 📊 **Export** — export orders to CSV as background job
- 🔔 **Real-time** — WebSocket notifications (low stock, order events)
- 📈 **Dashboard metrics** — SSE stream for live dashboard (total orders, revenue, top products)
- 🛡️ **Rate limiting** — Redis based per user/IP rate limiting
- 📄 **Pagination** — cursor based pagination on all list endpoints

## Architecture

Layered architecture with clear separation of concerns:

```
src/
├── config/        # App configuration (port, db, redis, jwt, cookie, etc)
├── controllers/   # HTTP layer — reads request, calls service, returns response
├── services/      # Business logic — decisions, rules, orchestration
├── repositories/  # Data access — all DB queries live here
├── models/        # Database schema (Drizzle table definitions)
├── schemas/       # Input validation (Zod)
├── middleware/    # Auth, RBAC, rate limit, error handling
├── routes/        # Route definitions and wiring
├── jobs/          # Background jobs (BullMQ workers + processors)
├── ws/            # WebSocket handlers
├── lib/           # Shared utilities (Redis, pagination, upload, cache)
└── types/         # Shared TypeScript types
```

Each layer only talks to the layer directly below it — controllers call services, services call repositories, repositories talk to the DB. Nothing skips layers.

## Prerequisites

- [Bun](https://bun.sh)
- [Docker](https://docker.com) — for Testcontainers

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/nitryuu/mini-pos
cd mini-pos
```

### 2. Install dependencies

```bash
bun install
```

### 3. Set up environment variables

```bash
cp .env.example .env
```

Fill in `.env`:

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mini-pos
REDIS_URL=redis://localhost:6379
JWT_ACCESS_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret
```

### 5. Run migrations

```bash
bun db:migrate
```

### 5. Seed initial data

```bash
bun db:seed
```

### 6. Start the server

```bash
bun dev
```

Server runs at `http://localhost:3000`

## Running Tests

```bash
# all tests
bun run test
```

> **Note:** Tests use Testcontainers — Docker must be running
