# Upload And RAG Proof

This document explains how to verify that Memoris OS is not only showing demo UI. The upload pipeline stores real uploaded knowledge, indexes it, and uses it for evidence-backed AI answers.

## What This Proves

Memoris OS supports this end-to-end flow:

```text
PDF/DOCX/TXT upload
  -> backend receives file
  -> text is extracted
  -> text is split into chunks
  -> embeddings are generated
  -> chunks are stored in PostgreSQL with pgvector
  -> search retrieves relevant authorized chunks
  -> Ask Memoris answers with evidence
  -> RBAC blocks unauthorized users
```

## Supported Upload Types

- PDF
- DOCX
- DOC
- TXT
- MD
- CSV

Normal text-based PDFs and DOCX files work. Scanned image-only PDFs need OCR, which is future work.

## UI Verification

Live app:

```text
https://memorisos.vercel.app
```

1. Sign in as Owner:

```text
owner@memoris.dev
password123
```

2. Open the `Knowledge` page.

3. In `Document Upload`, choose:

```text
sample-data/pdf/memoris-architecture-tech-stack.pdf
```

4. Click `Upload`.

Expected result:

```text
Upload complete
```

5. Go to `Ask Memoris`.

6. Ask:

```text
Why did we choose PostgreSQL and pgvector for Memoris OS?
```

Expected answer:

Memoris should explain that PostgreSQL is the system of record for organization data and pgvector stores embeddings for semantic retrieval. It should also mention that CockroachDB was considered as a future option if distributed SQL becomes necessary.

Expected evidence:

```text
Document: memoris-architecture-tech-stack
```

## Search Verification

After uploading `memoris-architecture-tech-stack.pdf`, search:

```text
PostgreSQL
```

Expected result:

The uploaded `memoris-architecture-tech-stack` document appears as a search result.

## RBAC Verification

1. Sign out.
2. Sign in as Employee:

```text
employee@memoris.dev
password123
```

3. Ask:

```text
Show me the CEO salary discussion.
```

Expected result:

```text
You do not have permission to access this information.
```

This proves that Memoris OS checks permissions before retrieval and before AI answer generation.

## API Verification

Health check:

```bash
curl https://memorisos.vercel.app/api/health
```

Expected:

```json
{"status":"ok"}
```

Login:

```bash
curl -X POST https://memorisos.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@memoris.dev","password":"password123"}'
```

The response returns a JWT token. Use that token for authenticated requests.

Search:

```bash
curl "https://memorisos.vercel.app/api/search?q=PostgreSQL" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Ask Memoris:

```bash
curl -X POST https://memorisos.vercel.app/api/ask \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"question":"Why did we choose PostgreSQL instead of CockroachDB?"}'
```

## Business Value

This upload flow makes Memoris OS useful because employees do not need to manually search through many old documents or meeting notes. They can ask a question, get a concise answer, and verify the answer with evidence.

The important security point is that the AI does not receive all company data. The backend first filters by organization, role, and team, then sends only authorized evidence to the AI provider.

## Demo Checklist

- Backend health works.
- Owner login works.
- Document upload works.
- Search finds uploaded content.
- Ask Memoris answers using uploaded evidence.
- Employee cannot access restricted information.
- Evidence cards are shown with the answer.
