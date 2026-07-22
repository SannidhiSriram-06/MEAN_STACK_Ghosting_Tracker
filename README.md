# JobTrack — MEAN-Stack Job Application & Ghosting Tracker

[![Framework](https://img.shields.io/badge/Frontend-Angular_21-dd0031.svg)](https://angular.dev)
[![Backend](https://img.shields.io/badge/Backend-Express_Node20-68a063.svg)](https://nodejs.org)
[![Database](https://img.shields.io/badge/Database-MongoDB_7-47a248.svg)](https://mongodb.com)
[![Auth](https://img.shields.io/badge/Auth-Clerk-6C47FF.svg)](https://clerk.com)
[![Deployment](https://img.shields.io/badge/Deployment-Vercel-000000.svg)](https://vercel.com)

**JobTrack** is an enterprise-grade MEAN-stack job search portal designed to automate application tracking, detect recruiter ghosting via daily background cron scans, evaluate resume alignment using LLM-powered Groq fit-checks, authenticate users via Clerk, and deploy serverlessly on Vercel.



## 🚀 Quick Start (Local Setup)

### Option A: Running with Docker Compose (Recommended)
```bash
docker compose up -d --build
```
* Access Frontend: [http://localhost:4200](http://localhost:4200)
* Access Backend API: [http://localhost:5001/health](http://localhost:5001/health)

### Option B: Running Locally (Node 20 + Angular CLI)
```bash
# 1. Start backend
cd backend
npm run start

# 2. Start frontend (in separate terminal)
cd frontend
npm start
```

---

## 🏗️ Architecture & Infrastructure

```
                                ┌────────────────────────────────┐
                                │     Angular 21 Web Portal      │
                                │  (Plus Jakarta Sans / Signals) │
                                └───────────────┬────────────────┘
                                                │ HTTP / REST (Clerk JWT)
                                                ▼
                                ┌────────────────────────────────┐
                                │      Express Node 20 API       │
                                │   - Auth Middleware (Clerk)    │
                                │   - Ghosting Cron (node-cron)  │
                                │   - AI Scoring (Groq LLaMA)    │
                                └───────────────┬────────────────┘
                                                │
                                                ▼
                                ┌───────────────────────────┐
                                │       MongoDB 7 DB        │
                                │   (Status / Skill Aggs)   │
                                └───────────────────────────┘
```

---

## 🛠️ Tech Stack & Requirements
* **Frontend**: Angular 21 (Standalone Components, Signals, Vanilla Glassmorphism CSS + Tailwind CSS)
* **UI/UX**: Custom Milkmaid/Green & Black/Acid Yellow Theme System, Lucide Angular Icons, Animated Landing Page
* **Backend**: Node.js 20 (Express CommonJS, Mongoose, node-cron, Multer, PDF-Parse)
* **AI Engine**: Groq API (`llama-3.3-70b-versatile`) with deterministic fallback
* **Deployment**: Vercel Serverless Functions
* **Authentication**: Clerk JWT Verification

---

## 🔒 Security & Environment Configuration
Copy `.env.example` to `.env` in project root:
```env
PORT=5001
MONGO_URI=mongodb://localhost:27017/jobtrack
GROQ_API_KEY=your_groq_key_here
GHOST_THRESHOLD_DAYS=10

# Clerk Configuration (Optional for Local Mock Mode)
CLERK_PEM_PUBLIC_KEY=
```
