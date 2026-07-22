# SCHEMA.md — JobTrack

> Phase 1 note: no schema is implemented yet — this document defines the target schema for Phase 2 (Core Schema + CRUD). Phase 1 only needs mongo running and reachable, no collections required.

## Collection: `applications`

```js
{
  _id: ObjectId,
  userId: String,           // Clerk User ID, required
  company: String,          // required
  role: String,             // required
  jobDescription: String,   // raw JD text, used later for fit-scoring
  dateApplied: Date,        // required
  status: String,           // enum: "applied" | "screening" | "interview" | "offer" | "rejected" | "ghosted"
  lastStatusChange: Date,   // updated whenever `status` changes; used by ghosting logic
  location: String,
  source: String,           // e.g. "LinkedIn", "referral", "campus", "cold outreach"
  notes: String,
  cvText: String,           // Extracted plain text from the uploaded CV PDF
  cvPdf: {                  // The physical PDF file stored as an embedded buffer
    data: Buffer,
    contentType: String,
    originalName: String
  },
  fitScore: {
    score: Number,          // 0–100, null until Phase 4 runs
    strengthSummary: String,
    redFlags: [String],
    actionableTips: [String],
    interviewPrepTips: [String],
    missingSkills: [String],
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

## Config
Ghosting threshold is managed via environment variables (`GHOST_THRESHOLD_DAYS` default 10) rather than a config collection, simplifying the database schema while retaining configurability.

## Indexes (Phase 2+)
- `applications.status` — for fast filtering on the list/stats views
- `applications.lastStatusChange` — for the ghosting-detection query to run efficiently as data grows

## Out of scope for schema (for now)
- No `users` collection — user accounts and authentication are handled entirely by Clerk. We just store the `userId` in Mongo.
- No separate `companies` collection — company is a plain string field on `applications`; normalizing into a separate collection is a possible future refactor, not needed at this scale.
