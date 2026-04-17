# Job Application Tracker (SaaS-Ready)

A production-grade job tracking system built with Next.js, Prisma, and PostgreSQL.
Designed to simulate a real SaaS product with analytics, workflow automation, and scalable architecture.

---

## 🚀 Features

### 📌 Application Management

- Kanban-style job tracking (Draft → Offer)
- Drag & drop stage updates
- Bulk actions (move, archive, delete)
- Timeline with notes & events

### ⏱ Follow-up & SLA Tracking

- Follow-up reminders with due/overdue states
- SLA breach detection per stage
- Visual indicators for urgency

### 📊 Analytics Dashboard

- Application velocity (7d / 30d)
- Stage conversion funnel
- Stage-wise performance breakdown
- Risk insights (overdue / SLA breaches)

### 📈 Source Intelligence

- Applications by source (LinkedIn, Referral, etc.)
- Conversion rate per source
- Identify best-performing job channels

### ⚡ Real-Time UX

- Instant UI updates using Zustand
- Optimistic updates (no page reloads)
- Smooth interactions across dashboard

### 🧱 Architecture

- Workspace-based multi-tenant ready design
- Clean API structure (Next.js App Router)
- Prisma ORM with PostgreSQL
- Domain-driven structure for scalability

---

## 🛠 Tech Stack

- **Frontend:** Next.js (App Router), React, TypeScript
- **State Management:** Zustand
- **Backend:** Next.js API Routes
- **Database:** PostgreSQL + Prisma ORM
- **Styling:** Custom CSS (dark/light themes)
- **Deployment (planned):** Vercel

---

## 📂 Project Structure

```
src/
  app/
    api/                # Backend routes
    dashboard/          # UI pages
  components/           # Reusable UI components
  domain/               # Business logic (SLA, stages, etc.)
  lib/                  # DB + helpers
```

---

## ⚙️ Environment Setup

Create a `.env` file:

```env
DATABASE_URL="your_postgres_connection_string"
```

---

## ▶️ Run Locally

```bash
npm install
npm run dev
```

Open:

```
http://localhost:3000
```

---

## 🧪 Production Build

```bash
npm run build
npm start
```

---

## 📌 Roadmap

- [x] Workspace-based architecture
- [x] Kanban job tracking
- [x] SLA + follow-up system
- [x] Analytics dashboard
- [x] Source analytics + conversion
- [ ] Authentication (multi-user)
- [ ] Role-based access control
- [ ] Notifications / reminders
- [ ] Deployment + live demo

---

## 💡 Purpose

This project is built to simulate a **real-world SaaS product**, focusing on:

- clean architecture
- scalable backend design
- production-ready UI/UX
- meaningful analytics

---

## 👤 Author

**Ovesh Shaikh**

- LinkedIn: https://www.linkedin.com/in/oveshshaikh786/
- GitHub: https://github.com/oveshshaikh786

---

## ⭐ Notes

This is an actively evolving project focused on building strong backend + product engineering skills.
