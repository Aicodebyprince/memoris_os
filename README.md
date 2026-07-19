# Memoris OS

Memoris OS is an enterprise memory operating system for meetings, documents, decisions, action items, and evidence-backed AI search.

The project is intentionally backend-first for SDE growth: Java Spring Boot, PostgreSQL, JWT auth, RBAC, Timeline Intelligence, and a React TypeScript dashboard.

## Stack

| Layer | Choice |
| --- | --- |
| Frontend | React, TypeScript, Vite, Tailwind, shadcn-style UI primitives |
| Backend | Java 21, Spring Boot, Spring Security, Spring Data JPA |
| Database | PostgreSQL, Flyway migrations, pgvector-ready Docker image |
| Auth | JWT, BCrypt, organization-scoped RBAC |
| AI | Gemini-ready backend service, local deterministic fallback |
| Search | PostgreSQL full-text-search path first, semantic search next |

## Product Workflow

1. User registers and creates or joins an organization.
2. JWT carries identity; backend resolves role and tenant membership.
3. User uploads a meeting transcript or document.
4. Backend generates structured knowledge: summary, decisions, actions, topics, participants.
5. Every important action becomes a timeline event.
6. Search retrieves only authorized records.
7. Ask Memoris checks RBAC before building AI context.
8. Answers return evidence cards so users can verify the source.

## Current MVP

- Auth endpoints for register/login.
- Organization membership and roles: Owner, Admin, Manager, Employee, Guest.
- Meeting processing endpoint.
- Document capture endpoint.
- Dashboard API.
- Timeline API.
- Enterprise search API.
- Ask Memoris API with permission denial for sensitive questions.
- Configurable AI provider: local fallback now, Gemini when `GEMINI_API_KEY` is set.
- Local demo data under the `local` Spring profile.
- Premium React dashboard with role switching, ingestion, timeline, search, Ask Memoris, and evidence.

## Run Locally

Fast path:

```powershell
.\start-dev.ps1
```

Then open `http://127.0.0.1:5173/`.

To stop services started by that script:

```powershell
.\stop-dev.ps1
```

### Backend

This repo includes a project-local Maven runner at `backend/mvn-local.ps1`.

```powershell
cd backend
.\run-local.ps1
```

Local demo organizations:

All accounts use `password123`.

| Organization | Owner | Admin | Manager | Employee | Guest |
| --- | --- | --- | --- | --- | --- |
| Memoris Labs | owner@memoris.dev | admin@memoris.dev | manager@memoris.dev | employee@memoris.dev | guest@memoris.dev |
| Helio Health | owner@heliohealth.dev | admin@heliohealth.dev | manager@heliohealth.dev | employee@heliohealth.dev | guest@heliohealth.dev |
| FinPilot Capital | owner@finpilot.dev | admin@finpilot.dev | manager@finpilot.dev | employee@finpilot.dev | guest@finpilot.dev |

### Frontend

On Windows PowerShell, use `npm.cmd` if `npm.ps1` is blocked.

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

Open `http://localhost:5173`.

### PostgreSQL

For a production-like database:

```powershell
cd infra
docker compose up -d
```

Then run the backend without the `local` profile and set the database environment variables if needed.

## Deployment

Use [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the live setup.

## Next Build Steps

1. Add `document_chunks` and `embedding vector(...)` columns with pgvector.
2. Add semantic retrieval for Ask Memoris.
3. Add refresh tokens and JWT rotation.
4. Add multipart PDF/DOCX upload with local/S3 storage.
5. Add integration tests for RBAC before AI retrieval.
6. Deploy frontend to Vercel, backend to Render/Railway, database to Neon/Supabase PostgreSQL.

Recommended product path:

1. Use H2 local mode while coding quickly.
2. Use PostgreSQL + pgvector for real persistent development.
3. Use Gemini for the first real AI provider because it has the easiest free-start path.
4. Add OpenAI/Spring AI later if you want the resume bullet and model-provider abstraction.

## Reference Docs

- [Spring REST](https://spring.io/guides/tutorials/rest/)
- [Spring Security](https://docs.spring.io/spring-boot/reference/web/spring-security.html)
- [Spring AI](https://docs.spring.io/spring-ai/reference/api/)
- [pgvector](https://github.com/pgvector/pgvector)
- [Vite](https://vite.dev/guide/)
