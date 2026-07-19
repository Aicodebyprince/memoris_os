# Memoris OS Runbook

## Fast Start

From the project root:

```powershell
.\start-dev.ps1
```

Open:

```text
http://127.0.0.1:5173/
```

Stop services started by the script:

```powershell
.\stop-dev.ps1
```

## Manual Start

Terminal 1:

```powershell
cd backend
.\run-local.ps1
```

Terminal 2:

```powershell
cd frontend
npm.cmd run dev
```

## Demo Accounts

All accounts use:

```text
password123
```

| Role | Email |
| --- | --- |
| Owner | owner@memoris.dev |
| Admin | admin@memoris.dev |
| Manager | manager@memoris.dev |
| Employee | employee@memoris.dev |
| Guest | guest@memoris.dev |

## Verification Commands

Frontend build:

```powershell
cd frontend
npm.cmd run build
```

Backend test lifecycle:

```powershell
cd backend
.\mvn-local.ps1 test
```

Backend package:

```powershell
cd backend
.\mvn-local.ps1 -DskipTests package
```

## PostgreSQL Mode

PostgreSQL is the best database for this project because it gives you persistent data, relational design, full-text search, and pgvector for semantic search.

You need Docker Desktop installed first.

One command from the project root:

```powershell
.\start-postgres-dev.ps1
```

Manual path:

Start database:

```powershell
cd infra
docker compose up -d
```

Run backend against PostgreSQL:

```powershell
cd backend
.\run-postgres.ps1
```

Use local mode first while developing features. Use PostgreSQL mode when you want to verify the Flyway schema and deployment-style setup.

## AI Direction

Use this order:

1. Local deterministic AI processor while building the product.
2. Gemini for live summaries, decisions, action items, and Ask Memoris.
3. Optional Spring AI/OpenAI provider later if you want a second provider.

Important rule: keep RBAC filtering before AI prompt construction.
