<p align="center">
  <img src="https://mochi.elitedev.space/favicon/favicon.svg" alt="Mochi Logo" width="90" height="90" />
</p>

<h1 align="center">Mochi Backend</h1>

<p align="center">
  <strong>A modern, high-performance site monitoring & cron scheduling engine.</strong>
</p>

<p align="center">
  Track uptime, monitor response times, and orchestrate background tasks for all your web services — built on a secure, type-safe, and blazingly fast TypeScript and Express stack.
</p>

<p align="center">
  <a href="https://typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" /></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/Node.js-20+-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node.js" /></a>
  <a href="https://expressjs.com"><img src="https://img.shields.io/badge/Express-5.1-000000?style=flat-square&logo=express&logoColor=white" alt="Express" /></a>
  <a href="https://prisma.io"><img src="https://img.shields.io/badge/Prisma-7-2D3748?style=flat-square&logo=prisma&logoColor=white" alt="Prisma" /></a>
  <a href="https://clerk.com"><img src="https://img.shields.io/badge/Clerk-Auth-6C47FF?style=flat-square&logo=clerk&logoColor=white" alt="Clerk Auth" /></a>
  <img src="https://img.shields.io/badge/License-ISC-007EC6?style=flat-square" alt="License" />
</p>

---

Mochi Backend serves as the robust core execution engine for the Mochi site monitoring suite. It manages dynamic multi-interval HTTP/HTTPS pings, handles real-time response telemetry collection, integrates Clerk session validation, and exposes structured analytics to keep you informed of your web services' health around the clock.

## 🚀 Key Features

* 🕐 **Dynamic Scheduling:** Spin up or stop pings dynamically at runtime using cron syntax.
* ⚡ **Ultra-low latency:** Optimized local cryptographic token validation (0ms auth overhead).
* 🔄 **Retry Policy:** Automatic failover handling with customizable delays.
* 📊 **Deep Insights:** In-memory statistics reporting alongside relational Prisma logging.
* 🛡️ **Clerk Integration:** Instant webhook sync and strict ownership validation per cron job.
* 📖 **OpenAPI / Swagger:** Beautiful interactive docs built directly into the service.

---

## 🛠️ Tech Stack & Architecture

* **Runtime:** Node.js (v20+) with TypeScript
* **Server Framework:** Express.js (v5.1)
* **Database & ORM:** PostgreSQL + Prisma (v7)
* **Authentication:** Clerk Express Session Token Verification
* **Email Dispatch:** Resend Mail Service
* **Scheduler Engine:** `node-cron` in-memory daemon

```
┌──────────────────┐      HTTPS Req       ┌────────────────┐
│  Mochi Frontend  ├─────────────────────>│ Mochi Backend  │
│ (React/Vite App) │    (Bearer Token)    │ (Express Engine│
└──────────────────┘                      └───────┬────────┘
                                                  │
                                   Prisma ORM     │  Dynamic Cron Daemon
                                                  ▼  (HTTP Heartbeats)
                                          ┌──────────────┐
                                          │  PostgreSQL  │
                                          └──────────────┘
```

---

## ⚙️ Installation & Local Setup

### 1. Clone the repository
```bash
git clone https://github.com/AshutoshDM1/Mochi-Backend
cd Mochi-Backend
```

### 2. Install dependencies
```bash
pnpm install
```

### 3. Setup Environment Variables
Create a `.env` file in the root folder using `.env.example` as a template:
```env
PORT=3000
DATABASE_URL="postgresql://user:pass@host:5432/mochi_db?schema=public"
CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
CLERK_WEBHOOK_SECRET="whsec_..."
RESEND_API_KEY="re_..."
```

### 4. Setup the Database Schema
Sync your database with the Prisma schema and auto-generate the Client:
```bash
pnpm prisma db push
pnpm prisma generate
```

### 5. Start the Development Server
```bash
pnpm run dev
```
The server will boot on `http://localhost:3000` and output live ping logs dynamically.

---

## 📋 API Routes Reference

All monitoring endpoints require a valid Clerk Bearer Token in the `Authorization` header.

### Authenticated Endpoints (`/api/v1/cron`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **GET** | `/` | List all active cron jobs belonging to the authenticated user |
| **GET** | `/:id` | Fetch detailed logs, statistics, and latency metrics for a specific job |
| **POST** | `/` | Schedule a new cron job dynamically |
| **DELETE** | `/:id` | Stop and delete an active cron job from the engine and DB |

#### Create Cron Schema (`POST /`)
```json
{
  "url": "https://mochi.elitedev.space",
  "interval": "*/5 * * * *"
}
```

---

## 📊 Cron Syntax Reference

Configure your tracking using standard 5-field cron syntax:

| Expression | Execution Interval |
| :--- | :--- |
| `*/5 * * * *` | Every 5 minutes |
| `*/15 * * * *` | Every 15 minutes |
| `0 */1 * * *` | Once every hour |
| `0 9 * * 1-5` | Every weekday at 9:00 AM |
| `0 0 * * 0` | Every Sunday at midnight |

---

## 🛡️ Production Checklist & Deployment

To deploy Mochi Backend to platforms like **Render**, **Heroku**, or **AWS**:

1. **Build the compiler output:**
   ```bash
   pnpm run build
   ```
2. **Launch the production bundle:**
   ```bash
   pnpm start
   ```
3. **Interactive Documentation:** Access swagger logs, test requests, and interactive API specs live at `https://your-domain.com/api-docs`.

---

## 📄 License

Distributed under the ISC License. See `package.json` for details.