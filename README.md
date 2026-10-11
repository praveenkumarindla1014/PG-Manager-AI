# 🏠 PG Manager AI — AI-first PG & Hostel Management

A full-stack app for running a PG (paying-guest home) or hostel: rooms & beds, tenants, rent, complaints, food menu, visitors, maintenance, notices and reports — with **PG Buddy**, an AI assistant that looks up real data, takes actions, and talks to owners and residents in **English, Hindi, Telugu, Tamil and Kannada**.

**Stack:** React 18 + Vite · Node.js + Express · MongoDB (Mongoose) · Socket.IO · any OpenAI-compatible LLM (OpenRouter / OpenAI) with automatic Google Gemini fallback.

---

## ⚡ Quick start

```bash
npm run setup      # installs backend + frontend dependencies
npm run dev        # starts API (http://localhost:5000) and app (http://localhost:5173)
```

Open **http://localhost:5173** and use a demo account:

| Role | Email | Password |
|---|---|---|
| Owner | `owner@smartpg.com` | `owner123` |
| Resident | `priya@test.com` | `tenant123` (any seeded tenant email works) |

On first start the database is empty, so demo data (15 rooms, 14 residents, six months of rent and expenses, complaints, menu, notices, visitors) is loaded automatically. Reset it any time with `npm run seed`.

### Database
The server connects in this order, so it always starts:
1. `MONGODB_URI` from `backend/.env`
2. MongoDB running locally on `127.0.0.1:27017`
3. A built-in embedded MongoDB stored in `backend/.data/` (no install needed)

### AI
Configure in `backend/.env` (see `backend/.env.example`):

```env
AI_API_KEY=sk-or-v1-...                 # OpenRouter key (or an OpenAI key + AI_BASE_URL unset)
AI_BASE_URL=https://openrouter.ai/api/v1
AI_MODEL=openai/gpt-4o-mini
GEMINI_API_KEY=...                      # free backup from https://aistudio.google.com/apikey
```

If the primary provider fails (bad key, outage, rate limit) requests move to Gemini automatically, rotating through several Gemini models when one hits its free-tier quota. If no AI is reachable at all, the assistant switches to an **offline intent engine** that still answers common questions from the database.

---

## ✨ Features

**PG Buddy (AI assistant)** — opens with the floating button or `Ctrl + K`
- Uses ~40 tools against live data: vacancy search, unpaid rent, record payments, send WhatsApp rent reminders, create/update complaints, approve visitors, publish notices, schedule maintenance, log expenses, monthly reports, forecasts
- Role-aware and permission-checked: residents only ever see their own data
- Understands mixed language ("naa room lo fan pani cheyatledu"), voice input in 5 languages, optional read-aloud replies
- Rich answer cards (rooms, payments, to-dos) with one-tap **Send on WhatsApp** buttons; conversations saved and resumable

**Owner**
- Live dashboard: bed occupancy, collections vs expected, profit, 6-month income/expense chart, occupancy by floor, AI daily brief & smart to-do list
- Rooms & beds (add/edit/delete, maintenance status), tenants (add with **Aadhaar OCR auto-fill**, move rooms, check out, temp-password sharing)
- Rent: automatic monthly dues on the 1st, overdue tracking, late fees, mark-paid, tenant-reported UPI payments, WhatsApp reminders, late-payment predictions
- Complaints: AI categorisation, priority, ETA, suggested staff, duplicate grouping, **emergency siren alert** for fire/gas/medical/security
- Maintenance scheduling with AI failure predictions (completed jobs auto-log their cost as an expense)
- Notices drafted by AI from rough notes and translated into 4 Indian languages, with read receipts
- Expenses, P&L, revenue optimisation tips and a **downloadable monthly PDF report**
- Visitor gate log with approvals; real-time notification centre

**Resident**
- Home screen with rent status, **Pay via UPI** deep link and "I've paid" confirmation, next meal, roommates, complaints and notices
- Report issues in plain words and track them; rate the fix or reopen it
- Weekly menu with nutrition and an AI diet advisor; PG rules Q&A (RAG over the owner's documents)
- Pre-register visitors; lifestyle profile for roommate matching

**Everywhere:** light/dark theme, responsive layout for phones, toasts, skeleton loading states and real-time updates over Socket.IO.

---

## 📁 Project structure

```
backend/
  config/db.js            # MongoDB connection with local + embedded fallback
  models/                 # Mongoose models
  routes/                 # REST API
  services/
    ai/                   # LLM client (multi-provider), chat engine, tools, analyzers
    stats.js              # shared business metrics
    paymentService.js     # dues, reminders, mark-paid
    complaintService.js   # AI triage + emergency escalation
    seedData.js           # demo data
    scheduler.js          # cron jobs (monthly dues, overdue, morning brief)
frontend/
  src/components/         # layout, AI chat, UI kit, charts
  src/context/            # auth, theme, toasts, realtime
  src/pages/              # one folder per screen
scripts/dev.mjs           # runs API + app together
```

## 🛠 Scripts

| Command | What it does |
|---|---|
| `npm run setup` | Install all dependencies |
| `npm run dev` | API + frontend with hot reload |
| `npm run seed` | Reset the database to demo data |
| `npm run build` | Production build of the frontend |
| `npm start` | Build, then serve app + API from http://localhost:5000 |
