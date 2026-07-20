# TECHSTACK.md — JobTrack

## Stack
- **Database:** MongoDB 7 (official `mongo` Docker image)
- **Backend:** Node.js 20, Express.js, CommonJS module style (`require`/`module.exports`) — not ES modules, for simplicity and broad tutorial/Stack Overflow compatibility during learning
- **Frontend:** Angular (latest stable via Angular CLI), standalone REST calls via `HttpClientModule` — no NgRx/state management library, this app is too small to justify it
- **Containerization:** Docker + Docker Compose, one container per service (mongo, backend, frontend)
- **LLM integration (Phase 4):** Groq API (LLaMA models) for fit-scoring — chosen for speed and free-tier availability over OpenAI, consistent with prior project experience
- **Language:** JavaScript throughout (not TypeScript on backend; Angular uses TypeScript by default via CLI, that's fine and expected)

## Conventions
- Backend routes live under `backend/src/routes/`, one file per resource (e.g. `applications.js`)
- Mongoose is used as the ODM (not raw MongoDB driver) for schema validation and simpler queries
- Environment variables via `.env` file (not committed) + `docker-compose.yml` `environment:` block for container-level values; `.env.example` committed as a template
- No authentication library in early phases — routes are open on localhost only
- REST, not GraphQL — matches API_SPEC.md and keeps the surface simple enough to defend line-by-line

## Explicitly NOT using
- **SQL / relational DB** — dropped, not part of this stack or the student's current toolkit
- **Pulumi** — dropped, Terraform is the IaC tool of choice elsewhere but not needed here (no cloud infra in this project, it's local Docker only)
- **Harness CI/CD** — not part of this project; GitHub Actions may be added later for CI, not before Phase 6
- **NgRx, Redux, or any global state library** — app state is small enough for component-level state + services
- **JWT/OAuth** — no auth in scope until explicitly revisited post-Phase 6

## Versions (pin these where practical)
- `node:20-alpine` base image for both frontend and backend Dockerfiles
- `mongo:7` image
- Angular CLI: latest stable at time of `ng new`
- Express: `^4.x`
- Mongoose: `^8.x`

## Local dev ports
- MongoDB: `27017`
- Backend (Express): `5000`
- Frontend (Angular dev server): `4200`
