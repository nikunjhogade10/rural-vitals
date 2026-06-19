# RuralCareLink — Local Run Instructions

## Prerequisites

- Node.js 18+
- PostgreSQL 14+ running locally (or Docker)

---

## 1. Setup PostgreSQL

Create a database:

```bash
psql -U postgres -c "CREATE DATABASE ruralcarelink;"
```

Or with Docker:

```bash
docker run --name rcl-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=ruralcarelink -p 5432:5432 -d postgres:15
```

---

## 2. Backend Setup

```bash
cd server

# Copy env
cp .env.example .env
# Edit .env → set DATABASE_URL with your PostgreSQL credentials

# Install deps (already done if you ran npm install)
npm install

# Run migrations
npx prisma migrate dev --name init

# Seed the database
npm run prisma:seed
```

**Seed credentials:**
| Role | Employee ID | Password |
|------|-------------|----------|
| Health Worker | `MH-2024-089` | `password123` |
| Doctor | `MH-DOC-042` | `password123` |

```bash
# Start the backend
npm run dev
# → Running at http://localhost:4000
```

---

## 3. Frontend Setup

```bash
# From project root
cd "/Users/nikunjsantoshhogade/Downloads/Design RuralCareLink App"

# .env already created → points to http://localhost:4000/api
npm install

# Start the frontend
node_modules/.bin/vite --port 5173
# → Running at http://localhost:5173
```

---

## 4. API Health Check

```bash
curl http://localhost:4000/api/health
# → {"status":"ok","timestamp":"..."}
```

---

## 5. Test Login

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"employeeId":"MH-2024-089","password":"password123"}'
```

---

## Project Structure

```
Design RuralCareLink App/
├── src/                      ← Frontend (React + Vite)
│   └── app/
│       ├── components/screens/   ← All screens (API-wired)
│       ├── services/             ← API client + service modules
│       ├── context/              ← AuthContext
│       └── App.tsx               ← Root with AuthProvider
├── server/                   ← Backend (Node.js + Express)
│   ├── src/
│   │   ├── modules/          ← 14 feature modules
│   │   ├── middlewares/      ← auth, validation, error handler
│   │   ├── config/           ← db.js, index.js
│   │   └── index.js          ← Express entry point
│   ├── prisma/
│   │   ├── schema.prisma     ← 15-model schema
│   │   └── seed.js           ← Dev seed data
│   └── .env                  ← Backend env vars
├── .env                      ← Frontend env (VITE_API_URL)
└── README-RUN.md             ← This file
```
