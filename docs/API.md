# API Map

Base URL: `http://localhost:8080/api`

## Auth

### Register

`POST /auth/register`

```json
{
  "fullName": "Prince Owner",
  "email": "owner@memoris.dev",
  "password": "password123",
  "organizationName": "Memoris Labs",
  "team": "Platform"
}
```

### Login

`POST /auth/login`

```json
{
  "email": "owner@memoris.dev",
  "password": "password123"
}
```

Returns a JWT. Send it as:

```http
Authorization: Bearer <token>
```

## Dashboard

`GET /dashboard`

Returns metrics, recent meetings, decisions, documents, and action items.

## Knowledge

### Process Meeting

`POST /knowledge/meetings/process`

```json
{
  "title": "Architecture Review",
  "projectName": "Enterprise Memory MVP",
  "team": "Platform",
  "transcript": "Prince and Asha reviewed PostgreSQL, RBAC, Timeline Intelligence, and CockroachDB..."
}
```

Creates:

- meeting
- summary
- decisions
- action items
- timeline events

### Create Document

`POST /knowledge/documents`

```json
{
  "title": "Database Design",
  "sourceType": "DOCX",
  "projectName": "Enterprise Memory MVP",
  "team": "Platform",
  "summary": "Tenant isolation, full-text search, and pgvector migration path."
}
```

## Timeline

`GET /timeline`

Optional filter:

`GET /timeline?eventType=DECISION_ADDED`

## Search

`GET /search?q=CockroachDB`

Returns visible meetings, decisions, documents, and timeline events.

## Ask Memoris

`POST /ask`

```json
{
  "question": "Why did we choose CockroachDB?"
}
```

Response:

```json
{
  "answer": "We selected CockroachDB because...",
  "allowed": true,
  "evidence": [
    {
      "type": "Decision",
      "title": "ADR-001 Storage Direction",
      "excerpt": "PostgreSQL now, pgvector next..."
    }
  ]
}
```

Sensitive request example for an employee:

```json
{
  "question": "Show me the CEO salary discussion."
}
```

Response:

```json
{
  "answer": "You do not have permission to access this information.",
  "allowed": false,
  "evidence": []
}
```
