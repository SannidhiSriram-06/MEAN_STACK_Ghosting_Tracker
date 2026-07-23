# PRD.md — JobTrack

## 1. Overview
JobTrack is a self-hosted job application tracker built to solve a real problem: after 40+ applications with almost no responses, there's no good way to see *when* an application has gone quiet ("ghosted"), compare fit across postings, or get a simple read on where time is being wasted. JobTrack is a MEAN-stack (MongoDB, Express, Angular, Node) web app that lets a single user log applications, automatically flags ones that have gone stale, uses an LLM to score fit between a resume and a job description, and shows basic stats on the whole pipeline.

This is a course project (MEAN stack module) as well as a personal tool. Scope is intentionally kept small and demo-able — this is not a SaaS product.

## 2. Problem Statement
Manually tracking 40–100+ job applications in a spreadsheet doesn't surface:
- Which applications have gone silent long enough to count as "ghosted"
- Which postings were actually a good skills/experience fit vs. a stretch application
- Aggregate patterns (response rate by company size, role type, time-to-ghost, etc.)

## 3. Goals (in scope)
- CRUD for job applications (company, role, date applied, status, JD text, notes)
- Automatic "ghosting" detection: an application with no status change past a configurable threshold (e.g. 10 days) is flagged as ghosted
- LLM-based fit score: given a resume and a job description, return a numeric fit score + short rationale
- Stats dashboard: counts by status, average time-to-response, ghosting rate, fit-score distribution
- User Authentication: Secure sign-up/login flows powered by Clerk
- Cloud deployment: Vercel serverless integration for both client and API functions

## 4. Non-goals (explicitly out of scope)
- Browser extension / auto-scraping of job boards
- Email parsing / inbox integration
- Complex cloud infrastructure (using Vercel, Clerk, and database text storage instead)
- Mobile app

## 5. Users
Primary user: the developer themself, a final-year CS student actively job hunting. Secondary "user" for demo purposes: course evaluators / viva panel, who need to see a working, explainable, end-to-end system — not a polished commercial product.

## 6. Success Criteria
- Can add, edit, delete, and list applications through the Angular UI
- Ghosting flag updates automatically without manual intervention
- Fit-score request round-trips through backend to an LLM API and returns a usable score
- Stats dashboard reflects live data from MongoDB
- Entire stack runs with a single `docker-compose up`
- Every architectural decision (schema, ghosting logic, prompt design) can be defended verbally in a viva

## 7. Phased Delivery
1. **Local Skeleton** — Docker Compose wiring, empty stub services, health-check route (current phase)
2. **Core Schema + CRUD** — real Mongo schema, Express REST routes, basic Angular forms/list
3. **Ghosting Detection** — scheduled/derived logic marking stale applications
4. **LLM Fit-Scoring** — resume + JD → score + rationale via LLM API
5. **Stats Dashboard** — aggregation queries + Angular charts
6. **Polish + Viva Prep** — error handling, edge cases, README, defensible explanations for every design choice

## 8. Key Risks
- LLM API cost/rate limits during demo — mitigate with caching or a small local test set
- Ghosting threshold is a heuristic, not ground truth — must be clearly framed as configurable, not "smart"
