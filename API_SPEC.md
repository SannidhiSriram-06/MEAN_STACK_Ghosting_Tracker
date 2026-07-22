# API_SPEC.md — JobTrack

Base URL (local dev): `http://localhost:5000` or `http://localhost:5001` depending on env.

All request/response bodies are JSON. Requests must include the Clerk authentication JWT Bearer token in the `Authorization` header.

## Health Check

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

---

## Core CRUD (`/api/applications`)

### `GET /api/applications`
List all applications. Supports optional query params: `?status=applied`, `?sort=dateApplied`.

### `GET /api/applications/:id`
Fetch a single application by ID.

### `POST /api/applications`
Create a new application.

### `PUT /api/applications/:id`
Update an application (including status changes).

### `DELETE /api/applications/:id`
Delete an application.

---

## Application Assets & Resumes

### `POST /api/applications/:id/cv-upload`
Upload a PDF CV for a specific application.

### `GET /api/applications/:id/cv-download`
Download the CV PDF attached to a specific application.

### `POST /api/applications/upload-resume`
Save a plain-text CV version.

### `GET /api/applications/resumes/list`
Retrieve a list of CV text versions.

### `DELETE /api/applications/resumes/:id`
Delete a specific CV version by ID.

---

## User Data Management

### `DELETE /api/applications/users/me/data`
Wipes all Application and ResumeVersion records for the authenticated user.

### `DELETE /api/applications/users/me`
Full account deletion (wipes data).

---

## Ghosting Detection & Fit Scoring

### `POST /api/applications/check-ghosting`
Manual trigger for ghosting scan.

### `POST /api/applications/:id/fit-score`
Sends the application's `jobDescription` plus a stored resume text to the LLM (Groq).

---

## Insights (`/api/insights`)

### `GET /api/insights/stats`
Aggregate stats across all applications (status distribution, average response time, etc).

### `GET /api/insights/skill-gap`
Retrieve most frequently missing skills across the user's fit-checked listings.

---

## Error format
Errors return a consistent shape:
```json
{ "error": "Human-readable message" }
```
