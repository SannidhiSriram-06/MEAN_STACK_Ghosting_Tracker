# JobTrack — 6 Phase Prompts (paste each into a NEW Claude chat)

How to use: start a fresh Claude chat for each phase, paste the whole block for that phase as your first message. Claude will walk you step by step and, whenever code is needed, hand you a ready-to-paste prompt for Cursor/Windsurf/Gemini CLI (whichever you name). Do the phases in order — don't skip ahead even if it's tempting.

---

## PHASE 1 — Local Skeleton (Docker + boot-up wiring)

```
I'm building JobTrack, a MEAN-stack job application tracker. Repo: https://github.com/SannidhiSriram-06/MEAN_STACK_Ghosting_Tracker
I've already committed PRD.md, TECHSTACK.md, SCHEMA.md, API_SPEC.md, and .cursorrules to the repo root.

This is Phase 1 of 6: Local Skeleton. Goal: get `docker-compose up` running mongo + backend + frontend as empty stubs, with a working health-check route connecting Angular → Express → confirms the wire is live. No auth, no real schema yet, no AI.

Walk me through this step by step:
1. What folder structure I need (frontend/, backend/, docker-compose.yml at root)
2. What goes in each Dockerfile and docker-compose.yml, and why
3. A minimal Express server with one GET /health route
4. A minimal Angular app that calls /health on load and displays the result
5. How to verify the whole thing works end-to-end with one command

I'm using [Cursor/Windsurf/Gemini CLI — tell me which one you're using] as my AI coding IDE. Whenever a step needs actual code generated, don't write the full code yourself — instead give me a clearly labeled, copy-pasteable prompt block I can paste directly into my IDE to generate that code, referencing PRD.md/TECHSTACK.md/SCHEMA.md/API_SPEC.md/.cursorrules where relevant so the IDE stays consistent with my existing docs. After each IDE prompt, tell me what to check/test before moving to the next step.

Explain any config choices (Docker networking, volume mounts, port mapping) in plain terms — I need to be able to defend this in a viva where I might get asked about any line.
```

---

## PHASE 2 — Core CRUD (no auth yet)

```
Continuing JobTrack (MEAN-stack job tracker). Repo: https://github.com/SannidhiSriram-06/MEAN_STACK_Ghosting_Tracker
Phase 1 (local Docker skeleton with working health-check) is done and working.

This is Phase 2 of 6: Core CRUD. Goal: implement the Application model (per SCHEMA.md) and full CRUD REST API (per API_SPEC.md) in Express/Mongoose, tested via Postman/Thunder Client, THEN build the Angular side (application form + Kanban-style list view) against it. Use a hardcoded fake userId for now (e.g., a constant) — do not build real auth yet, that's Phase 6. Structure the fake-user lookup as a single small function/middleware (e.g., getUserId(req)) so swapping in real Clerk auth later is a one-file change.

Walk me through this step by step:
1. Mongoose Application schema matching SCHEMA.md exactly
2. Express routes/controllers/services layering (controllers thin, logic in services) per .cursorrules
3. Order to build and test each CRUD endpoint (create → read/list → update → delete), with example Postman requests/responses for each
4. Angular side: reactive form for creating an application, a list/Kanban view fetching from the API, and status-update interaction
5. What manual tests to run to confirm each piece before moving on

I'm using [Cursor/Windsurf/Gemini CLI] as my AI coding IDE. For every implementation step, give me a labeled, copy-pasteable prompt for my IDE rather than writing the full code yourself — have it reference SCHEMA.md, API_SPEC.md, and .cursorrules from the repo so generated code stays consistent. After each IDE prompt, tell me exactly what to verify before continuing.

Flag anything where the real implementation might reasonably need to diverge from API_SPEC.md/SCHEMA.md, and explain why, rather than silently deviating.
```

---

## PHASE 3 — Ghosting Detection + Status History

```
Continuing JobTrack (MEAN-stack job tracker). Repo: https://github.com/SannidhiSriram-06/MEAN_STACK_Ghosting_Tracker
Phase 2 (core CRUD, Angular form + Kanban view, fake auth) is done and working.

This is Phase 3 of 6: Ghosting Detection + Status History. Goal per PRD.md section 5.1: a node-cron daily job that flips an application's status to GHOSTED if lastStatusChangeDate is more than GHOST_THRESHOLD_DAYS (default 10, from env var) ago and current status is APPLIED/OA/INTERVIEW. Every status change (manual or automatic) must append to the statusHistory array per SCHEMA.md, and lastStatusChangeDate must be kept in sync.

Walk me through this step by step:
1. Where the ghosting-check logic should live (a pure, testable service function separate from the cron scheduling itself, per .cursorrules — controllers/cron stay thin)
2. How to wire node-cron to call that function daily, and how to also expose it as a manually-triggerable endpoint/script for testing (since waiting 10 real days to test is impractical)
3. How the statusHistory append logic should work for both manual PATCH status changes and the automatic ghosting flip, so there's one shared code path, not two
4. How to write a basic jest unit test for the threshold logic itself (pure function, mock the current date)
5. Angular side: a timeline/history view component showing statusHistory per application

I'm using [Cursor/Windsurf/Gemini CLI] as my AI coding IDE. For each implementation step, give me a labeled, copy-pasteable IDE prompt referencing SCHEMA.md, API_SPEC.md, PRD.md section 5.1, and .cursorrules, rather than writing full code yourself. After each prompt, tell me how to manually test it (e.g., how to fake an old appliedDate/lastStatusChangeDate to trigger the flip without waiting).

Also give me a plain-English explanation of the cron + statusHistory design I can use to answer a viva question like "walk me through what happens when an application gets ghosted."
```

---

## PHASE 4 — AI Fit-Check (CV x JD)

```
Continuing JobTrack (MEAN-stack job tracker). Repo: https://github.com/SannidhiSriram-06/MEAN_STACK_Ghosting_Tracker
Phase 3 (ghosting cron + status history) is done and working.

This is Phase 4 of 6: AI Fit-Check. Goal per PRD.md section 5.2 and API_SPEC.md: a POST /applications/:id/fit-check endpoint that sends CV text + JD text to an LLM (Groq API, per TECHSTACK.md), gets back a structured score/verdict/matchedSkills/missingSkills/reason, maps score to the verdict enum (STRONG_MATCH 75-100, COIN_FLIP 45-74, REACH 0-44), runs a deterministic keyword-overlap cross-check alongside it, and flags lowConfidence if the two scores diverge by more than 30 points. Result caches on the Application document's fitCheck field.

Start with hardcoded/pasted CV and JD text (no file upload yet — that's Phase 6 alongside S3). 

Walk me through this step by step:
1. Getting a free Groq API key and setting it as an env var (never expose it to the frontend)
2. Designing the exact prompt to get strict, reliable JSON back from the LLM
3. Backend logic: calling the LLM, defensively parsing the response (try/catch, handle malformed JSON, retry once, fallback error state per .cursorrules), computing the keyword-overlap score, mapping to verdict enum, checking lowConfidence
4. Caching the result on the Application doc and returning it per API_SPEC.md's response shape
5. Angular side: a simple fit-check form (paste CV/JD) and a result display with the verdict badge

I'm using [Cursor/Windsurf/Gemini CLI] as my AI coding IDE. For each step, give me a labeled, copy-pasteable IDE prompt referencing PRD.md section 5.2, API_SPEC.md, SCHEMA.md, and .cursorrules, instead of writing full code yourself. After each prompt, tell me how to test it, including how to deliberately test the malformed-LLM-response fallback path.

Also explain the prompt design and the LLM-reliability handling in plain terms so I can defend "how do you handle the AI being wrong" in viva.
```

---

## PHASE 5 — Stats Dashboard + Skill-Gap Aggregation

```
Continuing JobTrack (MEAN-stack job tracker). Repo: https://github.com/SannidhiSriram-06/MEAN_STACK_Ghosting_Tracker
Phase 4 (AI fit-check with hardcoded CV/JD input) is done and working.

This is Phase 5 of 6: Stats Dashboard + Skill-Gap Aggregation. Goal per PRD.md sections 5.3/5.4 and API_SPEC.md: GET /insights/stats (total, byStatus, ghostRate, responseRate, avgDaysToFirstResponse, bySource) and GET /insights/skill-gap (ranked missingSkills frequency across all fit-checked applications), both built with MongoDB/Mongoose aggregation pipelines, plus an Angular dashboard view with charts (Chart.js/ngx-charts per TECHSTACK.md).

Walk me through this step by step:
1. Designing the Mongoose aggregation pipeline for /insights/stats field by field — explain each stage ($match, $group, etc.) so I understand what it's doing, not just that it works
2. Designing the aggregation for /insights/skill-gap (unwind + group + sort on missingSkills across applications)
3. Backend route/controller/service wiring per .cursorrules
4. Angular dashboard component: chart setup, data binding, layout
5. How to sanity-check the aggregation output against manually counting a small set of test applications, so I trust the numbers

I'm using [Cursor/Windsurf/Gemini CLI] as my AI coding IDE. For each step, give me a labeled, copy-pasteable IDE prompt referencing PRD.md sections 5.3/5.4, API_SPEC.md, SCHEMA.md, and .cursorrules, instead of writing full code yourself. After each prompt, tell me how to verify it.

Also give me a plain-English walkthrough of one aggregation pipeline (pick the stats one) I can use to answer "explain this aggregation pipeline stage by stage" in viva — this is a likely question.
```

---

## PHASE 6 — Clerk Integration & Vercel Config

```
Continuing JobTrack (MEAN-stack job tracker). Repo: https://github.com/SannidhiSriram-06/MEAN_STACK_Ghosting_Tracker
Phase 5 (stats dashboard + skill-gap aggregation) is done and working. The app currently uses a fake hardcoded userId and pasted CV/JD text.

This is Phase 6 of 6: Clerk & Vercel Integration. Goal: swap the fake-userId middleware for real Clerk authentication (JWT verification middleware, Angular login flow + auth interceptor), and add real CV file upload — parsing PDF via pdf-parse directly in-memory and caching the extracted text in MongoDB ResumeVersion collection, eliminating any S3 binary upload since we are deploying to a serverless Vercel backend.

Walk me through this step by step:
1. Setting up a Clerk account, retrieving the Frontend API keys, and setting the PEM public key as an environment variable (never exposing private keys to frontend)
2. Backend: JWT verification middleware using jsonwebtoken and jwks-rsa to validate Clerk sessions, extracting user ID (clerk user sub) and details to populate req.user
3. Angular: Integration of Clerk auth interceptor attaching the bearer token to api calls, login routing redirection
4. PDF parsing: multer -> pdf-parse text extraction in-memory -> cache on ResumeVersion.extractedText in Mongoose
5. Updating the fit-check flow to pull CV text from the selected ResumeVersion instead of pasted text
6. Final Vercel configuration (`vercel.json`) and environment variable setup for deployment

I'm using [Cursor/Windsurf/Gemini CLI] as my AI coding IDE. For each step, give me a labeled, copy-pasteable IDE prompt referencing SCHEMA.md, API_SPEC.md, TECHSTACK.md, and .cursorrules, instead of writing full code yourself. After each prompt, tell me exactly how to test it.

Finish with a short summary I can use as a viva answer for "why Clerk instead of Cognito or hand-rolled JWT" and "why in-memory PDF parsing and text caching instead of binary S3 uploads in serverless environments."
```

---

### Notes
- Fill in `[Cursor/Windsurf/Gemini CLI]` with whichever you're actually using in that session before pasting.
- If a phase chat runs long or you need to resume later, tell the new chat which phase you're on and what's already done — these prompts assume a fresh chat per phase, not one continuous thread.
- Don't start a phase's Claude chat until the previous phase is actually working, not just "code generated" — Windsurf/Cursor can generate code that doesn't run.
