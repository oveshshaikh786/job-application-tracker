# 📋 Job Application Tracker

An AI-powered job tracking app with a Kanban board, SLA deadline tracking, and analytics dashboard. Built with TypeScript, Prisma, and PostgreSQL.

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)

> 🚀 **Live Demo:** [job-tracker.vercel.app](https://your-demo-link.vercel.app) <!-- Replace with real link -->

---

## ✨ Features

- 🗂 **Kanban Board** — drag-and-drop job cards across Applied → Interview → Offer → Rejected
- ⏰ **SLA Tracking** — automatic deadline alerts for follow-ups
- 📊 **Analytics Dashboard** — response rates, pipeline stats, stage conversion
- 🤖 **AI Integration** — smart suggestions for follow-up timing and resume tips
- 🔐 **Auth** — secure login with session management

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js, React, TypeScript |
| Database | PostgreSQL |
| ORM | Prisma |
| Styling | Tailwind CSS |
| Deployment | Vercel + Railway |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL

### Installation

```bash
git clone https://github.com/oveshshaikh786/job-application-tracker.git
cd job-application-tracker

npm install

cp .env.example .env
```

### Environment Variables

```env
DATABASE_URL=postgresql://user:password@localhost:5432/jobtracker
NEXTAUTH_SECRET=your_secret
NEXTAUTH_URL=http://localhost:3000
OPENAI_API_KEY=your_openai_key   # optional, for AI features
```

### Database Setup

```bash
npx prisma migrate dev
npx prisma db seed    # optional seed data
```

### Run Locally

```bash
npm run dev
# Open http://localhost:3000
```

---

## 📸 Screenshots

> *(Add screenshots here)*

---

## 📁 Project Structure

```
├── app/              # Next.js app router
├── components/       # UI components (Kanban, Charts)
├── prisma/           # Schema & migrations
├── lib/              # DB client, auth, utils
└── types/            # TypeScript interfaces
```

---

## 🔮 Planned Improvements

- [ ] Resume parsing with AI
- [ ] Email reminders
- [ ] Chrome extension for 1-click job saving
- [ ] Export to CSV

---

## 👤 Author

**Ovesh Shaikh** · [LinkedIn](https://linkedin.com/in/oveshshaikh786) · [Portfolio](https://portfolio-ovesh.vercel.app)
