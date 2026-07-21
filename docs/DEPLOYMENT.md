# Deployment

Current production-style demo setup:

```text
Frontend: Vercel
Backend: AWS EC2 Ubuntu
Reverse proxy: Nginx
Database: Neon PostgreSQL + pgvector
AI provider: Gemini, with OpenAI-ready configuration and local fallback
```

## URLs

Frontend:

```text
https://memorisos.vercel.app
```

Health check through Vercel proxy:

```text
https://memorisos.vercel.app/api/health
```

Backend health through EC2/Nginx:

```text
http://98.90.196.6/api/health
```

## Backend EC2 Setup

Install packages:

```bash
sudo apt update
sudo apt install -y openjdk-21-jdk git nginx unzip curl maven
```

Clone repo:

```bash
cd ~
git clone https://github.com/Aicodebyprince/memoris_os.git
cd memoris_os/backend
```

Create `.env`:

```env
SPRING_PROFILES_ACTIVE=production
PORT=8080

DATABASE_URL='jdbc:postgresql://YOUR_NEON_HOST/YOUR_DATABASE?sslmode=require&channel_binding=require'
DATABASE_USERNAME=YOUR_NEON_USERNAME
DATABASE_PASSWORD='YOUR_NEON_PASSWORD'

JWT_SECRET='replace-with-a-long-random-64-plus-character-secret'
JWT_EXPIRES_MINUTES=720

CORS_ALLOWED_ORIGINS=https://memorisos.vercel.app,http://98.90.196.6,http://localhost:5173,http://127.0.0.1:5173
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

Important: quote the `DATABASE_URL` because the Neon URL contains `&`.

Build backend:

```bash
mvn -DskipTests package
```

## systemd Service

Create service:

```bash
sudo nano /etc/systemd/system/memoris.service
```

Paste:

```ini
[Unit]
Description=Memoris OS Spring Boot Backend
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/memoris_os/backend
EnvironmentFile=/home/ubuntu/memoris_os/backend/.env
ExecStart=/usr/bin/java -jar /home/ubuntu/memoris_os/backend/target/memoris-backend-0.1.0.jar
Restart=always
RestartSec=10
SuccessExitStatus=143

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable memoris
sudo systemctl start memoris
sudo systemctl status memoris --no-pager
```

Logs:

```bash
journalctl -u memoris -f
```

Restart after changing `.env` or rebuilding:

```bash
sudo systemctl restart memoris
```

## Nginx Proxy

Create config:

```bash
sudo nano /etc/nginx/sites-available/memoris
```

Paste:

```nginx
server {
    listen 80;
    server_name 98.90.196.6;

    location /api/ {
        proxy_pass http://127.0.0.1:8080/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable:

```bash
sudo ln -sf /etc/nginx/sites-available/memoris /etc/nginx/sites-enabled/memoris
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

## AWS Security Group

Keep:

```text
HTTP 80 from 0.0.0.0/0
HTTPS 443 from 0.0.0.0/0
SSH 22 from My IP
```

Do not keep public `8080` open after Nginx proxy works.

## Vercel Setup

Project settings:

```text
Framework Preset: Vite
Root Directory: frontend
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

Do not set `VITE_API_BASE_URL` in Vercel. The frontend should call relative `/api` routes.

`frontend/vercel.json` proxies API traffic:

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "http://98.90.196.6/api/:path*"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

## Smoke Test

1. Open `https://memorisos.vercel.app/api/health`.
2. Confirm it returns `{"status":"ok"}`.
3. Open `https://memorisos.vercel.app`.
4. Sign in as `owner@memoris.dev` / `password123`.
5. Go to Knowledge and upload `sample-data/pdf/memoris-architecture-tech-stack.pdf`.
6. Ask `Why did we choose PostgreSQL and pgvector for Memoris OS?`.
7. Confirm the answer includes evidence.
8. Sign out and sign in as `employee@memoris.dev`.
9. Ask `Show me the CEO salary discussion.`
10. Confirm access is denied.
