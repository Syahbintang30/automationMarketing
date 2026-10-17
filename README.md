# Wardell Lead Engine
## AI-Assisted Business Lead Generation & Email Outreach Automation Platform

> **Target Market:** Indonesian businesses and SMEs requiring modern website development, company profiles, custom web applications, internal operational dashboards, and digital process digitization.

---

## 🌟 Executive Overview

**Wardell Lead Engine** is an enterprise-grade B2B lead discovery and outreach automation platform engineered for **Wardell Tech**. It provides both an **interactive automated scraper CLI bot** and a **modern web dashboard (Vue 3 + Express + PostgreSQL)** with built-in human-in-the-loop review, strict compliance guardrails (Indonesian PDP Law UU No. 27/2022), formula-injection-safe Excel/CSV export, and Gmail API (OAuth 2.0) sending.

---

## 🏗️ Architecture & Technology Stack

```
                              ┌───────────────────────────────────┐
                              │     VUE 3 SINGLE PAGE APP        │
                              │ (Vite + TS + Pinia + Vue Router)  │
                              └─────────────────┬─────────────────┘
                                                │ REST API /api/v1
                                                ▼
┌──────────────────────┐      ┌───────────────────────────────────┐      ┌─────────────────────────┐
│  AUTOMATED CLI BOT   ├─────►│        EXPRESS.JS BACKEND         │◄─────┤ BULLMQ QUEUE WORKERS    │
│  (npm run bot:scrape)│      │    (TypeScript + Zod + Helmet)    │      │ (Discovery/Enrich/Send) │
└──────────────────────┘      └─────────────────┬─────────────────┘      └───────────┬─────────────┘
                                                │                                    │
                                                ▼                                    │
                              ┌───────────────────────────────────┐                  │
                              │     POSTGRESQL 15 + PRISMA        │◄─────────────────┘
                              │  (Normalized relational schema)   │
                              └─────────────────┬─────────────────┘
                                                │
                     ┌──────────────────────────┼──────────────────────────┐
                     ▼                          ▼                          ▼
            Google Places (New)          AI Provider Engine           Gmail API OAuth 2.0
            & Public Directories        (Gemini 1.5 Flash / OpenAI)   (AES-256-GCM Encrypted)
```

* **Frontend:** Vue 3, TypeScript, Vite, Vue Router 4, Pinia, Vanilla CSS Design System with dark glassmorphism.
* **Backend:** Node.js (v22+), Express.js, TypeScript, Zod validation, Pino logger, Helmet, CORS, Rate Limiting.
* **Database & ORM:** PostgreSQL 15+, Prisma ORM with versioned migrations and seeds.
* **Queues & Background:** Redis, BullMQ.
* **Integrations:**
  * **Lead Discovery:** Google Places API (New) adapter (strict `place_id` retention) + Indonesian Public Commercial Directory & Maps Scraper.
  * **Website Contact Enrichment:** Automated crawler for corporate emails (`info@`, `kontak@`), phone/WhatsApp, and source provenance with `robots.txt` compliance.
  * **AI Copywriting:** Google Gemini / OpenAI structured prompt engine generating natural, respectful Indonesian B2B copy.
  * **Email Dispatch:** Gmail API OAuth 2.0 with AES-256-GCM encrypted token storage.
  * **Spreadsheet Export:** ExcelJS for `.xlsx` and `.csv` with automatic formula injection prevention.

---

## 🚀 Quick Start Guide

### 1. Prerequisites
* **Node.js**: `v20+` or `v22+` (v22.20.0 tested)
* **npm**: `v10+`
* **PostgreSQL**: `v15+` (running on `localhost:5432`)
* **Redis**: (optional for background workers or BullMQ; local CLI bot runs directly)

### 2. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure `DATABASE_URL` matches your local PostgreSQL credentials:
```env
DATABASE_URL="postgresql://syahbintang@localhost:5432/wardell_leads?schema=public"
DRY_RUN=true
```

### 3. Database Migration & Seeding
Install all dependencies, push the database schema, and seed the initial admin account and Indonesian location dataset:
```bash
npm install
npm --workspace=@wardell/backend run prisma:push
npm --workspace=@wardell/backend run prisma:seed
```
* **Default Admin Credentials:**
  * Email: `admin@wardell.tech`
  * Password: `WardellAdmin2026!`

---

## 🤖 Running the Automated Scraper & Lead Bot (CLI)

You can run the bot directly from your terminal to scrape leads, enrich their contact details from company websites, store them in PostgreSQL, and export them directly to Excel (.xlsx) or CSV!

### Basic Usage:
```bash
npm run bot
```

### Custom Targeting with Arguments:
```bash
npm run bot -- --province="Jawa Barat" --city="Kota Bandung" --category="Hotel" --limit=25 --format=xlsx
```

### Supported Flags:
* `--province`: Target Indonesian province (e.g. `"Jawa Barat"`, `"DKI Jakarta"`, `"Jawa Timur"`, `"Bali"`)
* `--city`: Target city/regency (e.g. `"Kota Bandung"`, `"Kota Surabaya"`, `"Jakarta Pusat"`)
* `--category`: Business category or query keyword (e.g. `"Software House"`, `"Distributor"`, `"Cafe & Resto"`, `"Klinik"`)
* `--limit`: Number of candidate leads to discover (default: `25`)
* `--format`: Output format: `xlsx` (Excel) or `csv` (default: `xlsx`)
* `--output`: Custom output filepath (default: `./backend/exports/leads_<province>_<timestamp>.<format>`)

All exported files are safely stored in `backend/exports/`.

---

## 🖥️ Running the Web Application

### Start Backend API:
```bash
npm run dev:backend
```
The API server listens on `http://localhost:4000`.

### Start Frontend UI:
```bash
npm run dev:frontend
```
Open `http://localhost:5173` in your browser.

### Unified Production Mode:
The Express server automatically serves the built Vue 3 frontend bundle:
```bash
npm --workspace=@wardell/frontend run build
npm --workspace=@wardell/backend run build
npm --workspace=@wardell/backend run start
```
Open `http://localhost:4000` to access the full UI and API together.

---

## 🛡️ Compliance & Security Safeguards

1. **Indonesian Personal Data Protection Law (UU PDP No. 27/2022):**
   * Targets exclusively corporate B2B inboxes (`info@`, `kontak@`, `halo@`, `sales@`, `support@`).
   * Permanent recording of `email_source_url` provenance and retrieval timestamps.
   * Automated, cryptographic one-click unsubscribe links in every email draft (`/api/v1/opt-out?email=...&token=...`).
   * Instant suppression: Opted-out recipients are barred from any future automated contact.

2. **Spreadsheet Formula Injection Prevention:**
   * All exported strings beginning with `= `, `+`, `-`, or `@` are automatically sanitized by prefixing with a single quote (`'`), preventing malicious code execution in Microsoft Excel, LibreOffice, or Google Sheets.

3. **Google Places API Storage Compliance:**
   * Only the permanent identifier `place_id` is retained permanently in PostgreSQL.
   * CRM contact data is enriched through authorized public directories and official websites.

4. **OAuth 2.0 Credential Encryption:**
   * Gmail OAuth refresh and access tokens are encrypted with **AES-256-GCM** using `ENCRYPTION_KEY`. Plaintext tokens are never stored or exposed.

5. **Dry-Run Mode Guardrail:**
   * `DRY_RUN=true` is enabled by default. Outbound emails are strictly simulated with full audit logs without dispatching real emails.

---

## 🧪 Automated Testing

Run the Vitest test suite covering authentication, lead deduplication, formula injection prevention, AI draft generation, suppression checks, and health endpoints:

```bash
npm test:backend
```

**Test Results:**
* `tests/health.test.ts` (3 tests)
* `tests/auth.test.ts` (3 tests)
* `tests/leads_and_export.test.ts` (5 tests)
* `tests/discovery_and_enrichment.test.ts` (4 tests)
* `tests/drafts_and_ai.test.ts` (4 tests)
* `tests/sending_and_suppression.test.ts` (5 tests)
* `tests/dashboard.test.ts` (3 tests)
* **Total: 27 passing tests (100% pass rate)**

---

## 📡 Core API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/v1/health` | GET | Liveness probe & uptime |
| `/api/v1/ready` | GET | Readiness probe for PostgreSQL & Redis |
| `/api/v1/auth/login` | POST | Authenticate and obtain JWT |
| `/api/v1/auth/me` | GET | Get current authenticated operator |
| `/api/v1/stats` | GET | Executive KPI metrics & distribution |
| `/api/v1/campaigns` | GET/POST | List and create campaigns |
| `/api/v1/campaigns/:id/discover` | POST | Trigger automated lead scraper for campaign |
| `/api/v1/campaigns/:id/drafts` | POST | Trigger AI draft generation for campaign leads |
| `/api/v1/campaigns/:id/pause` | POST | Pause campaign |
| `/api/v1/campaigns/:id/resume` | POST | Resume campaign |
| `/api/v1/leads` | GET/POST | Filter and upsert leads with deduplication |
| `/api/v1/exports/leads` | GET | Stream XLSX or CSV file (with formula injection defense) |
| `/api/v1/drafts` | GET | List email drafts with approval filter |
| `/api/v1/drafts/:id/approve` | POST | Approve email draft for sending |
| `/api/v1/drafts/:id/reject` | POST | Reject email draft with reason |
| `/api/v1/sending-queue` | GET | View outreach message dispatch logs |
| `/api/v1/sending-queue/process`| POST | Execute approved sending queue (with pre-flight checks) |
| `/api/v1/sending-queue/pause` | POST | Global pause for outbound emails |
| `/api/v1/opt-out` | GET | Public compliance unsubscribe endpoint |
| `/api/v1/suppression-list` | GET/POST | View and manage suppressed contacts |
| `/api/v1/jobs` | GET | Background job execution history |

---

## 📄 License

Proprietary — Developed for Wardell Tech.
