# SCHEMA.md — JobTrack

> Phase 1 note: no schema is implemented yet — this document defines the target schema for Phase 2 (Core Schema + CRUD). Phase 1 only needs mongo running and reachable, no collections required.

## Collection: `applications`

```js
{
  _id: ObjectId,
  company: String,          // required
  role: String,             // required
  jobDescription: String,   // raw JD text, used later for fit-scoring
  dateApplied: Date,        // required
  status: String,           // enum: "applied" | "screening" | "interview" | "offer" | "rejected" | "ghosted"
  lastStatusChange: Date,   // updated whenever `status` changes; used by ghosting logic
  location: String,
  source: String,           // e.g. "LinkedIn", "referral", "campus", "cold outreach"
  notes: String,
  fitScore: {
    score: Number,          // 0–100, null until Phase 4 runs
    rationale: String,
    scoredAt: Date
  },
  createdAt: Date,
  updatedAt: Date
}
```

### Field notes
- `status` starts as `"applied"` on creation. It is manually updated by the user OR automatically flipped to `"ghosted"` by a scheduled check (Phase 3) if `lastStatusChange` is older than the configured ghosting threshold and status is not already a terminal state (`offer`/`rejected`).
- `lastStatusChange` is distinct from `updatedAt` — `updatedAt` changes on any edit (e.g. fixing a typo in notes), `lastStatusChange` only changes when `status` itself changes. This distinction matters for ghosting logic accuracy.
- `fitScore` is a nested object, null/absent until the user triggers a fit-score request in Phase 4. Kept nested rather than flattened so it's easy to re-score without touching other fields.

## Collection: `config` (single document, Phase 3+)

```js
{
  _id: ObjectId,
  ghostingThresholdDays: Number,  // default 21
  updatedAt: Date
}
```

Kept as a single-document collection rather than hardcoding the threshold, so it's adjustable without a redeploy — small thing, but defensible as "configurable business logic" in a viva.

## Indexes (Phase 2+)
- `applications.status` — for fast filtering on the list/stats views
- `applications.lastStatusChange` — for the ghosting-detection query to run efficiently as data grows

## Out of scope for schema (for now)
- No `users` collection — single-user app, no auth in current phases
- No separate `companies` collection — company is a plain string field on `applications`; normalizing into a separate collection is a possible future refactor, not needed at this scale
