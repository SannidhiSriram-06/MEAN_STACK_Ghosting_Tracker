# API_SPEC.md — JobTrack

Base URL (local dev): `http://localhost:5000`

All request/response bodies are JSON. Requests must include the Clerk authentication JWT Bearer token in the `Authorization` header.

## Phase 1 (current)

### `GET /health`
Health check — confirms the backend is up and reachable from the frontend.

**Response `200`:**
```json
{
  "status": "ok",
  "service": "backend",
  "timestamp": "2026-07-14T10:00:00.000Z"
}
```

No other routes exist in Phase 1. Everything below is target spec for later phases — do not implement yet.

---

## Phase 2 — Core CRUD (`/api/applications`)

### `GET /api/applications`
List all applications. Supports optional query params: `?status=applied`, `?sort=dateApplied`.

**Response `200`:** array of application objects (see SCHEMA.md)

### `GET /api/applications/:id`
Fetch a single application by ID.

**Response `200`:** application object
**Response `404`:** `{ "error": "Application not found" }`

### `POST /api/applications`
Create a new application.

**Request body:**
```json
{
  "company": "Acme Corp",
  "role": "SDE Intern",
  "jobDescription": "...",
  "dateApplied": "2026-07-01",
  "location": "Hyderabad",
  "source": "LinkedIn"
}
```
`status` defaults to `"applied"` server-side; not required in the request body.

**Response `201`:** created application object

### `PUT /api/applications/:id`
Update an application (including status changes). If `status` in the body differs from the stored value, backend also updates `lastStatusChange` to now — this is backend logic, not something the client sends directly.

**Response `200`:** updated application object

### `DELETE /api/applications/:id`
Delete an application.

**Response `204`:** no content

---

## Phase 3 — Ghosting Detection

### `POST /api/applications/check-ghosting`
Triggers a scan: any application with `status` not in `["offer","rejected"]` and `lastStatusChange` older than the configured threshold gets `status` set to `"ghosted"`.

**Response `200`:**
```json
{ "updatedCount": 3 }
```

(Whether this runs on a schedule (`node-cron`) vs. only on manual trigger is a Phase 3 design decision, not fixed yet.)

---

## Phase 4 — Fit Scoring

### `POST /api/applications/:id/fit-score`
Sends the application's `jobDescription` plus a stored resume text to the LLM (Groq) and stores the result back on the application.

**Response `200`:**
```json
{
  "score": 78,
  "rationale": "Strong match on cloud/DevOps tooling, gap on production Kubernetes experience."
}
```

---

## Phase 5 — Stats

### `GET /api/stats`
Aggregate stats across all applications.

**Response `200`:**
```json
{
  "totalApplications": 45,
  "byStatus": { "applied": 30, "interview": 4, "rejected": 8, "ghosted": 25, "offer": 0 },
  "ghostingRate": 0.55,
  "averageFitScore": 64.2
}
```

---

## Error format (all phases)
Errors return a consistent shape:
```json
{ "error": "Human-readable message" }
```
with an appropriate HTTP status code (400 for bad input, 404 for not found, 500 for server error).
