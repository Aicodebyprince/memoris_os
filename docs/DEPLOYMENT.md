# Memoris OS Deployment

This is the clean live setup:

- Frontend: Vercel
- Backend: Render or Railway
- Database: Neon PostgreSQL
- AI: Gemini first, local fallback while no key is configured

## 1. Local Final Check

```powershell
cd C:\Users\princ\OneDrive\Desktop\Memoris_OS\memoris-os-enterprise
powershell -ExecutionPolicy Bypass -File .\start-dev.ps1
```

Open:

- Frontend: `http://127.0.0.1:5173/`
- Backend health: `http://localhost:8080/api/health`

The dashboard should show:

- Backend: `Connected`
- Signed In: `Prince Owner` or one seeded demo user
- AI Provider: `Local AI` unless Gemini is configured

## 2. Backend Environment Variables

Set these on Render/Railway:

```env
SPRING_PROFILES_ACTIVE=production
PORT=8080

DATABASE_URL=jdbc:postgresql://YOUR_NEON_HOST/YOUR_DATABASE?sslmode=require
DATABASE_USERNAME=YOUR_NEON_USER
DATABASE_PASSWORD=YOUR_NEON_PASSWORD

JWT_SECRET=YOUR_LONG_RANDOM_SECRET_64_PLUS_CHARS
JWT_EXPIRES_MINUTES=720

CORS_ALLOWED_ORIGINS=https://YOUR_VERCEL_APP.vercel.app,http://localhost:5173,http://127.0.0.1:5173
DEMO_SEED_ENABLED=true

AI_PROVIDER=gemini
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
GEMINI_MODEL=gemini-3.5-flash
```

Use `AI_PROVIDER=local` until you have the Gemini key. Use `DEMO_SEED_ENABLED=true` for the public demo app so the three demo organizations are created in Neon.

## 3. Backend Build Settings

Native Java deployment:

```bash
cd backend
mvn -DskipTests package
java -jar target/memoris-backend-0.1.0.jar
```

Render/Railway commands:

- Build command: `cd backend && mvn -DskipTests package`
- Start command: `cd backend && java -jar target/memoris-backend-0.1.0.jar`

Docker deployment is also ready with `backend/Dockerfile`.

## 4. Frontend Environment Variables

Set this on Vercel:

```env
VITE_API_BASE_URL=https://YOUR_BACKEND_URL
```

Local frontend can use:

```env
VITE_API_BASE_URL=http://localhost:8080
```

If this value is empty locally, Vite will use its `/api` proxy.

## 5. Frontend Build Settings

Vercel settings:

- Root directory: `frontend`
- Build command: `npm run build`
- Output directory: `dist`

## 6. What To Give Codex/User For Live Setup

Needed values:

- GitHub repo URL after pushing this project
- Neon database connection details
- Render/Railway backend URL after first deploy
- Vercel frontend URL after first deploy
- Gemini API key

After the backend is live, update:

- Backend `CORS_ALLOWED_ORIGINS` with the real Vercel URL
- Frontend `VITE_API_BASE_URL` with the real backend URL

## 7. Live Smoke Test

1. Open `https://YOUR_BACKEND_URL/api/health`.
2. Confirm JSON has `"status":"ok"`.
3. Open the Vercel frontend.
4. Click `Check API`.
5. Click `Owner`.
6. Process a transcript.
7. Search `PostgreSQL`.
8. Ask `Why did we choose PostgreSQL?`.
9. Switch to `Employee` and ask a salary/HR question; it should deny permission.
