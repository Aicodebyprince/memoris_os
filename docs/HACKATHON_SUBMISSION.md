# Hackathon Submission

## Category

Work and productivity

## Project Name

Memoris OS

## Live Demo

https://memorisos.vercel.app

## Repository

https://github.com/Aicodebyprince/memoris_os

## Short Description

Memoris OS is an enterprise memory operating system for teams. It captures meetings, documents, decisions, action items, and timeline events, then lets users ask natural language questions against company knowledge with role-based access control and evidence-backed AI answers.

## Longer Description

Teams often forget why decisions were made because the context is buried across PDFs, meeting notes, docs, and old action items. Memoris OS solves that by turning company knowledge into structured, searchable memory.

Users sign in to an organization with a role such as Owner, Admin, Manager, Employee, or Guest. They can upload meeting notes, transcripts, PDFs, DOCX files, and text documents. The backend extracts text, splits it into chunks, generates embeddings, and stores the chunks in PostgreSQL with pgvector. When a user asks a question, Memoris checks their organization, role, and team permissions before retrieving knowledge. Only authorized evidence is sent to the AI layer, and the final response includes evidence cards so users can verify the answer.

The demo shows a real business workflow: upload the Memoris architecture document, ask why PostgreSQL and pgvector were chosen, receive an evidence-backed answer, then sign in as an Employee and confirm restricted information is denied.

## What Makes It Useful

- Employees can find old decisions without reading many documents.
- New teammates can understand project history quickly.
- Managers can track actions and decisions through timeline intelligence.
- Sensitive information stays protected by RBAC.
- AI answers are auditable because every answer includes source evidence.

## Technical Implementation

- React, TypeScript, Vite, and Tailwind frontend.
- Java 21 Spring Boot backend.
- Spring Security JWT authentication.
- Multi-tenant organization and role model.
- Neon PostgreSQL database with Flyway migrations.
- pgvector document chunk storage and semantic retrieval.
- Apache PDFBox and Apache POI for PDF/DOCX text extraction.
- Gemini/OpenAI-ready AI service with local fallback.
- AWS EC2 backend running behind Nginx.
- Vercel frontend with `/api` proxy to the backend.

## How Codex And GPT-5.6 Were Used

Codex with GPT-5.6 was used throughout the build as the primary engineering partner. It helped turn the product idea into a real backend-first architecture, implement Spring Boot auth/RBAC, design the React dashboard, build the document RAG pipeline, debug Neon/pgvector issues, deploy the backend on AWS EC2, configure Nginx and Vercel routing, and generate tests plus demo-ready documentation.

The biggest Codex-assisted decisions were:

- RBAC must happen before any AI context is retrieved or sent to the model.
- Documents should be stored as structured chunks with embeddings, not only raw files.
- Every AI answer should include evidence so users can verify trust.
- The hackathon deployment should use Vercel, AWS EC2, Neon PostgreSQL, and Nginx for speed and reliability.

## Judge Test Accounts

All passwords:

```text
password123
```

Recommended:

```text
Owner: owner@memoris.dev
Employee: employee@memoris.dev
```

Other demo organizations are available:

```text
owner@heliohealth.dev
owner@finpilot.dev
```

## Suggested Judge Test

1. Open the live demo.
2. Sign in as `owner@memoris.dev`.
3. Go to Knowledge.
4. Upload `sample-data/pdf/memoris-architecture-tech-stack.pdf`.
5. Ask `Why did we choose PostgreSQL and pgvector for Memoris OS?`.
6. Confirm the answer includes evidence.
7. Sign out and sign in as `employee@memoris.dev`.
8. Ask `Show me the CEO salary discussion.`
9. Confirm Memoris returns a permission denial.

## Feedback Session ID

Run `/feedback` in the Codex session where the core functionality was built, then paste that session ID into the Devpost submission form.
