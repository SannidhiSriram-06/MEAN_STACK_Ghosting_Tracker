# TECHSTACK.md — JobTrack

## Stack
- **Database:** MongoDB 7 (official `mongo` Docker image / MongoDB Atlas)
- **Backend:** Node.js 20, Express.js, CommonJS module style (`require`/`module.exports`) — not ES modules, for simplicity and broad compatibility
- **Frontend:** Angular (latest stable via Angular CLI), standalone REST calls via `HttpClientModule` — no NgRx/state management library, this app is too small to justify it
- **Styling & UI:** Tailwind CSS for landing page utilities, CSS variables for robust light/dark mode (Milkmaid/Green and Black/Acid Yellow themes), Lucide Angular for icons
- **Containerization / Hosting:** Local development via Docker + Docker Compose (mongo, backend, frontend); Production deployment via Vercel (frontend and backend functions)
- **Authentication:** Clerk Authentication (JWT verification middleware on backend, local fallback mode for development)
- **LLM integration:** Groq API (LLaMA models) for fit-scoring — chosen for speed and free-tier availability
- **Language:** JavaScript throughout (not TypeScript on backend; Angular uses TypeScript by default, which is expected)

## Conventions
- Backend routes live under `backend/src/routes/`, one file per resource (e.g. `applications.js`)
- Mongoose is used as the ODM for schema validation and simpler queries
- Environment variables via `.env` file (not committed)
- REST, not GraphQL — keeps the API simple and easy to debug

## Explicitly NOT using
- **Custom Auth or File Storage** — using Clerk for auth and database-level text caching for resumes
- **SQL / relational DB** — MongoDB fits our document structure
- **NgRx, Redux, or any global state library** — app state is small enough for component-level state + services
- **Terraform or IaC** — deploying directly via Vercel Integration

## Local dev ports
- MongoDB: `27017`
- Backend (Express): `5001`
- Frontend (Angular dev server): `4200`
