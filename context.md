# JobTrack — AI Agent Project Context

This file serves as a comprehensive project overview and reference index for any AI coding agent (e.g., Claude, Cursor, Codex, Antigravity) to instantly understand the codebase structure, architectures, integrations, and deployment schemas.

---

## 1. Project Overview

**JobTrack** is a self-hosted, cloud-capable job application tracker designed for CS students and developers. It solves the issue of tracking silent applications, comparing resume alignment with job descriptions using an LLM, and generating analytics of the application funnel.

### Core Features:
- **Core CRUD**: Log applications (Company, Role, Description, Source, Location, Notes).
- **Automated Ghosting Detection**: Daily scheduled scanner (`node-cron` job) that flags active applications as `ghosted` if they exceed a configured threshold with no updates.
- **Status Timeline History**: Tracks every manual or automated status change in an audit trail array.
- **LLM Fit-Checking**: Connects to the Groq API (LLaMA models) to analyze CV vs. JD alignment, return a numeric score, match/missing skill tags, and detect anomalies (divergence between keyword overlap and LLM scores).
- **Insights Dashboard**: Aggregates response rates, sources, average response speeds, and top missing skill gaps using MongoDB aggregation pipelines.
- **Auto-Adapting Security & Storage**: Real AWS Cognito JWT validation and S3 file uploading that **automatically fall back** to Local Mock Auth and Local Disk Storage if AWS environment variables are missing.

---

## 2. Directory Structure

This structure represents the project layout. Note that frontend builds compile to `frontend/dist/frontend`.

```
.
├── AGENTS.md                   # AWS development experience rules (loaded by Agents)
├── API_SPEC.md                 # Specifications for all REST endpoints
├── AWS_INTEGRATION.md          # Manual AWS console & credential setup walkthrough
├── PHASE_PROMPTS.md            # The 6 phased prompt guidelines used to build the app
├── PRD.md                      # Product Requirements Document
├── SCHEMA.md                   # Database collection structures & indexes
├── TECHSTACK.md                # Development conventions & environment constraints
├── context.md                  # This file (AI context guide)
├── docker-compose.yml          # Local container orchestration definition
├── backend/
│   ├── Dockerfile              # Node-alpine image builder for Backend
│   ├── package.json            # Backend package configuration
│   └── src/
│       ├── index.js            # Express server entrypoint & daily cron scheduler
│       ├── middleware/
│       │   └── auth.js         # JWT validator with Cognito verifier and Local Mock fallback
│       ├── models/
│       │   ├── Application.js  # Main application schema with statusHistory and fitScore
│       │   ├── Config.js       # Singlet configuration model for ghost threshold settings
│       │   └── ResumeVersion.js# Resume versions tracker mapping parsed PDF text and S3 keys
│       ├── routes/
│       │   ├── applications.js # CRUD actions, resume uploading, and fit-scoring triggers
│       │   └── insights.js     # Analytics endpoints utilizing MongoDB pipelines
│       └── services/
│           ├── fitCheckService.js # Groq API client + keyword overlap validation logic
│           ├── ghostingService.js # Threshold validator and DB state updating functions
│           ├── ghostingService.test.js # Jest threshold logic validation tests
│           └── s3Service.js    # S3 file uploader falling back to local filesystem if unset
└── frontend/
    ├── Dockerfile              # Angular development runtime server container
    ├── angular.json            # Angular build workspace configuration
    ├── package.json            # Angular client dependencies (ver 21.2.0)
    └── src/
        ├── index.html          # HTML shell injecting Font Awesome icons
        ├── main.ts             # Angular compilation bootstrap
        ├── styles.css          # Glassmorphic dark theme global layouts
        └── app/
            ├── app.config.ts   # Standalone configuration injecting `provideHttpClient()`
            ├── app.html        # SPA dashboard template containing tabs, charts, and modals
            ├── app.ts          # Main controller managing state signals and API calls
            └── services/
                ├── api.service.ts  # REST client mapping Express routes with bearer tokens
                └── auth.service.ts # State store for credentials and mock fallback flags
```

---

## 3. Architecture & Flows

### Local Development (Docker Compose)
* **Ports**: Frontend `4200`, Backend `5000`, MongoDB `27017`.
* **State**: Saved locally to MongoDB container volume. Resumes uploaded inside `backend/uploads/` on the local host.
* **Security**: Backend auto-assigns token request claims to a mock profile (`mock-user-123`, `Viva Candidate`).

### AWS Serverless Cloud Deployment (Terraform)
* **Compute**: **AWS ECS Fargate** runs all three containers (Frontend, Backend, MongoDB) inside a single task definition on public subnets, saving EC2 maintenance overhead.
* **VPC Networking**: Custom VPC containing two public subnets mapped to an Internet Gateway and route tables, restricting container ports to the task security group.
* **Database State**: **Amazon EFS** (Elastic File System) provisions a persistent volume mounted directly to MongoDB container path `/data/db`.
* **Resume Files**: Uploads are saved to a private **AWS S3** bucket with Block Public Access active.
* **Authentication**: **AWS Cognito User Pool** validates requests using a JWT verifier, matching client identity directly on the backend.

---

## 4. Key Configurations & Credentials

The backend reads these environment variables from `.env` or container settings:
- `PORT` (default `5000`)
- `MONGO_URI` (default `mongodb://localhost:27017/jobtrack`)
- `GROQ_API_KEY` (Enables Groq LLM fit-scoring. If missing, backend falls back to deterministic keyword overlap scoring)
- `GHOST_THRESHOLD_DAYS` (default `10`)
- `COGNITO_USER_POOL_ID` / `COGNITO_CLIENT_ID` / `COGNITO_REGION` (Triggers active Cognito JWT checks)
- `S3_BUCKET_NAME` / `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_REGION` (Triggers active S3 uploads)

---

## 5. Development Guidelines for AI Tools

When building features or refactoring files in this codebase, adhere to:
1. **Modular Services**: Logic belongs in services (e.g. `fitCheckService.js`, `ghostingService.js`), not inside route controllers.
2. **Defensive API Errors**: All route controllers must wrap code in `try/catch` blocks and return errors in a uniform JSON format: `{ "error": "Message" }`.
3. **Graceful Fallbacks**: Any AWS integration or third-party call (like S3 or Groq) must have a local, offline fallback behavior.
4. **Standalone Angular**: Frontend components use standalone API imports. Do not introduce global `NgModules`. Use Angular Signals for reactive state.
5. **No Style Frameworks**: Use the custom Vanilla CSS variables and layouts in `frontend/src/styles.css`. Do not add Tailwind or bootstrap.
