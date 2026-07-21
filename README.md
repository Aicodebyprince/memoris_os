# Memoris OS

Memoris OS is an enterprise memory operating system for teams. It captures meetings, documents, decisions, action items, and timeline events, then lets users ask questions against company knowledge with role-based access control and evidence-backed AI answers.

Live demo: https://memorisos.vercel.app  
Backend health: https://memorisos.vercel.app/api/health  
Category: Work and productivity

## Why It Matters

Teams lose context in meeting notes, PDFs, scattered documents, and old decisions. Memoris OS turns that information into a searchable, permission-safe memory layer. A manager can ask why a technical decision was made, a new employee can understand project history, and leadership can trust every AI answer because it includes evidence.

## Core Demo

1. Sign in as an Owner.
2. Upload `sample-data/pdf/memoris-architecture-tech-stack.pdf`.
3. Memoris extracts text, chunks it, embeds it, and stores it in PostgreSQL with pgvector.
4. Search for `PostgreSQL` or ask `Why did we choose PostgreSQL and pgvector for Memoris OS?`.
5. Memoris returns an answer with evidence from the uploaded document.
6. Sign in as an Employee and ask for restricted salary/HR information.
7. Memoris denies access instead of leaking protected context.

## Demo Accounts

All demo accounts use:

```text
password123
```

| Organization | Owner | Admin | Manager | Employee | Guest |
| --- | --- | --- | --- | --- | --- |
| Memoris Labs | owner@memoris.dev | admin@memoris.dev | manager@memoris.dev | employee@memoris.dev | guest@memoris.dev |
| Helio Health | owner@heliohealth.dev | admin@heliohealth.dev | manager@heliohealth.dev | employee@heliohealth.dev | guest@heliohealth.dev |
| FinPilot Capital | owner@finpilot.dev | admin@finpilot.dev | manager@finpilot.dev | employee@finpilot.dev | guest@finpilot.dev |

## Features

- Multi-tenant organizations with isolated data.
- JWT authentication with Spring Security.
- Roles: Owner, Admin, Manager, Employee, Guest.
- Dashboard with organization metrics, recent meetings, decisions, documents, action items, and timeline activity.
- Meeting processing into summaries, decisions, action items, participants, topics, and timeline events.
- PDF, DOCX, DOC, TXT, MD, and CSV upload support.
- Text extraction, chunking, embeddings, and pgvector retrieval.
- Enterprise search across documents, meetings, decisions, and timeline events.
- Ask Memoris AI assistant with evidence cards.
- RBAC filtering before search results or AI context are returned.
- Live deployment with Vercel frontend, AWS EC2 backend, Nginx proxy, and Neon PostgreSQL.

## Architecture

```text
User
  -> Vercel React frontend
  -> /api proxy
  -> AWS EC2 Nginx
  -> Spring Boot backend
  -> Neon PostgreSQL + pgvector
  -> Gemini/OpenAI/local fallback AI service
```

RAG flow:

```text
Upload PDF/DOCX/TXT
  -> extract text
  -> split into chunks
  -> create embeddings
  -> store chunks in PostgreSQL pgvector
  -> embed user question
  -> retrieve authorized chunks
  -> send only allowed context to AI
  -> return answer + evidence
```

## Tech Stack

| Layer | Choice |
| --- | --- |
| Frontend | React, TypeScript, Vite, Tailwind, shadcn-style UI primitives |
| Backend | Java 21, Spring Boot, Spring Security, Spring Data JPA |
| Database | PostgreSQL, Flyway, pgvector |
| Auth | JWT, BCrypt, organization-scoped RBAC |
| AI | Gemini, OpenAI-ready, deterministic local fallback |
| Document parsing | Apache PDFBox, Apache POI |
| Deployment | Vercel, AWS EC2, Nginx, Neon PostgreSQL |

## Local Setup

Requirements:

- Java 21
- Node.js 20+
- PostgreSQL with pgvector, or Neon PostgreSQL

Create `backend/.env`:

```env
SPRING_PROFILES_ACTIVE=production
PORT=8080

DATABASE_URL='jdbc:postgresql://YOUR_NEON_HOST/YOUR_DATABASE?sslmode=require&channel_binding=require'
DATABASE_USERNAME=YOUR_NEON_USERNAME
DATABASE_PASSWORD='YOUR_NEON_PASSWORD'

JWT_SECRET='replace-with-a-long-random-64-plus-character-secret'
JWT_EXPIRES_MINUTES=720
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
DEMO_SEED_ENABLED=true

AI_PROVIDER=gemini
AI_EMBEDDING_DIMENSIONS=768
GEMINI_API_KEY='YOUR_GEMINI_API_KEY'
GEMINI_MODEL=gemini-3.5-flash
GEMINI_EMBEDDING_MODEL=gemini-embedding-001

OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

Run both apps on Windows:

```powershell
cd C:\Users\princ\OneDrive\Desktop\Memoris_OS\memoris-os-enterprise
powershell -NoProfile -ExecutionPolicy Bypass -File .\start-neon-dev.ps1
```

Open:

```text
http://127.0.0.1:5173
```

Stop local services:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\stop-dev.ps1
```

## Manual Backend Run

```bash
cd backend
mvn -DskipTests package
set -a
source .env
set +a
java -jar target/memoris-backend-0.1.0.jar
```

Health check:

```text
http://localhost:8080/api/health
```

## Tests

Backend tests:

```bash
cd backend
mvn test
```

Frontend build:

```bash
cd frontend
npm install
npm run build
```

## Sample Data

Use the files in `sample-data/` for the demo:

- `memoris-architecture-tech-stack.md`
- `memoris-security-rbac-rag.md`
- `pdf/memoris-architecture-tech-stack.pdf`
- `pdf/memoris-security-rbac-rag.pdf`

Upload them from the Knowledge page. For the best demo, ask architecture questions as the Owner, then sign in as an Employee and ask for restricted salary/HR information to show that private knowledge is not exposed.

For exact upload verification steps, see [docs/UPLOAD_RAG_PROOF.md](docs/UPLOAD_RAG_PROOF.md).

## How Codex Accelerated The Build

Codex with GPT-5.6 was used as the primary build partner for the project. It accelerated:

- Translating the product workflow into a Spring Boot + React architecture.
- Implementing multi-tenant JWT auth and RBAC.
- Building the premium dashboard, landing page, login, organization demos, and role-aware navigation.
- Adding the RAG backend: PDF/DOCX extraction, chunking, embeddings, pgvector storage, semantic search, and evidence-based answers.
- Debugging local backend issues, CORS, Vercel rewrites, EC2 deployment, Nginx proxying, and Neon configuration.
- Writing tests and smoke-testing upload, search, Ask Memoris, and permission denial flows.

Key engineering decisions were made with Codex during implementation: RBAC filtering happens before AI context is built, uploaded documents are decomposed into evidence chunks, and every AI answer is backed by source evidence rather than being a black-box chat response.

## Deployment Notes

Current live setup:

```text
Frontend: Vercel
Backend: AWS EC2 Ubuntu + systemd + Nginx
Database: Neon PostgreSQL with pgvector
AI: Gemini configured through backend environment variables
```

Important deployment details:

- Do not commit `.env` files or API keys.
- Add the Vercel domain to `CORS_ALLOWED_ORIGINS`.
- Keep public inbound ports to `80` and `443`; use SSH `22` from your IP only.
- Nginx proxies `/api` to the local Spring Boot backend on port `8080`.

## License

MIT License. See [LICENSE](LICENSE).
