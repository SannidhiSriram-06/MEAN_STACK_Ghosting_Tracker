# trim.md — JobTrack Codebase Audit

> Full audit of every file in the repository.
> Covers: dead code, unnecessary complexity, orphaned CSS, undefined CSS variables, React-contamination checks, API mismatches, and style redundancies.
> **No React code was found anywhere in the actual source files.** The only occurrence of the word `react` in application code is in `fitCheckService.js` line 23 — it is a skill keyword string inside an array (`'react'`), which is intentional and correct.

---

## CRITICAL — Undefined CSS Variables (will silently fail / look broken)

### frontend/src/styles.css

| Line | Problem | Fix |
|------|---------|-----|
| 781 | `var(--border-radius-lg)` is **never defined** in `:root` or `[data-theme]`. Used by `.vercel-command-dialog`. | Replace with `var(--border-radius)` or define `--border-radius-lg: 20px;` in `:root`. |
| 783 | `var(--shadow-glass)` is **never defined**. Used by `.vercel-command-dialog`. | Define `--shadow-glass: 0 16px 48px rgba(0,0,0,0.5);` in `:root`, or replace inline. |
| 1006 | `var(--border-radius-lg)` again — used by `.auth-13-card`. Same issue as L781. | Same fix as above. |

---

## DEAD CODE — CSS Classes Defined But Never Used in Any Template

These classes exist in `styles.css` but do **not** appear anywhere in `app.html` or any component template. They are safe to delete.

### frontend/src/styles.css

| Lines | Class(es) | Why Dead |
|-------|-----------|----------|
| 638–655 | `.auth-container`, `.auth-panel` | Old auth layout replaced by `.auth-13-*` system. Template now uses `.auth-13-wrapper` / `.auth-13-card`. These legacy classes are completely orphaned. |
| 657–675 | `.auth-title`, `.auth-title h2`, `.auth-title p` | Part of the same old auth system, never referenced. |
| 684–701 | `.skill-tag`, `.skill-tag-matched`, `.skill-tag-missing` | Slide-over detail panel was supposed to use these for matched/missing skills. Template renders them as plain text instead. Classes are dead. |
| 703–761 | `.timeline`, `.timeline::before`, `.timeline-item`, `.timeline-dot`, `.timeline-dot.active`, `.timeline-info`, `.timeline-header`, `.timeline-date`, `.timeline-reason` | A full timeline rendering system for `statusHistory` was styled but **not rendered in `app.html`**. All timeline CSS is dead. |
| 473–489 | `.badge`, `.badge-applied`, `.badge-screening`, `.badge-interview`, `.badge-offer`, `.badge-rejected`, `.badge-ghosted` | Template uses `.pill-badge.pill-{status}` for status display, not `.badge-*`. This family is entirely orphaned. NOTE: the per-status `.pill-applied`, `.pill-offer`, etc. colour styles are also **missing** from the stylesheet — status badges render as unstyled text. Either add pill colour rules or switch to the `.badge-*` system already defined. |
| 1063–1121 | `.vercel-nav-bar`, `.vercel-nav-top`, `.vercel-nav-tabs`, `.vercel-nav-tab`, and related | A full Vercel-style horizontal nav bar system. App uses a **sidebar** layout. This entire block is dead. |

**Total dead CSS lines to delete: approx 130 lines (L638–701, L703–761, L473–489, L1063–1121)**

---

## DUPLICATE / REDUNDANT CSS

### frontend/src/styles.css

| Lines | Issue | Fix |
|-------|-------|-----|
| 890–896 | `.vercel-command-footer kbd` rule is **defined twice** — identical declaration at L882–888 and again at L890–896. | Delete the second copy (L890–896). |
| 258–264 | `.main-content` sets `padding: 32px 40px` but the template overrides it entirely with inline `style="padding: 0; display: flex; flex-direction: column;"`. The CSS padding is dead for the actual element. | Remove `padding` from `.main-content` CSS or remove the inline style — not both. |
| 266–271 | `.header-bar` defines `margin-bottom: 28px` but conflicts with the sticky header's position-based layout. | Remove `margin-bottom` from `.header-bar` CSS. |
| 273–285 | `.page-title h1` and `.page-title p` are defined, but `.page-title` is never used as a class in `app.html`. | Delete L273–285. |

---

## UNNECESSARILY COMPLEX CODE

### frontend/src/app/services/api.service.ts

**Problem (L29–36): Manual query-string building is verbose and fragile.**

CURRENT — unnecessarily complex:
```typescript
getApplications(status?: string, sort?: string): Observable<any[]> {
  let url = `${this.baseUrl}/applications`;
  const params: string[] = [];
  if (status) params.push(`status=${status}`);
  if (sort) params.push(`sort=${sort}`);
  if (params.length > 0) url += `?${params.join('&')}`;
  return this.http.get<any[]>(url, { headers: this.getHeaders() });
}
```

SIMPLER — use Angular's built-in HttpParams:
```typescript
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';

getApplications(status?: string, sort?: string): Observable<any[]> {
  let params = new HttpParams();
  if (status) params = params.set('status', status);
  if (sort) params = params.set('sort', sort);
  return this.http.get<any[]>(`${this.baseUrl}/applications`, {
    headers: this.getHeaders(), params
  });
}
```
HttpParams handles encoding, joining, and edge cases automatically.

---

### frontend/src/app/app.ts

**Problem (L339–347): Form reset duplicates the initial shape in two places.**

```typescript
// CURRENT — same literal written twice (constructor + reset)
this.newApp = {
  company: '', role: '', jobDescription: '',
  dateApplied: new Date().toISOString().split('T')[0],
  location: '', source: 'LinkedIn', notes: ''
};
```

SIMPLER — extract a factory function:
```typescript
private getDefaultApp() {
  return {
    company: '', role: '', jobDescription: '',
    dateApplied: new Date().toISOString().split('T')[0],
    location: '', source: 'LinkedIn', notes: ''
  };
}
protected newApp = this.getDefaultApp();
// In createApplicationSubmit(): this.newApp = this.getDefaultApp();
```

---

**Problem (L402): `deleteApplication()` uses native `confirm()` dialog.**

The app already has a proper modal pattern for destructive actions (isDeleteDataOpen / isDeleteAccountOpen). Using native `confirm()` for application deletion is inconsistent.

---

**CRITICAL BUG (L381): `triggerFitCheck()` reads `res.application` but the API returns `app.fitScore` directly.**

In `applications.js` L242: `res.json(app.fitScore)` — the response IS the fitScore object, not `{ application: ... }`.
So `res.application` in `app.ts` L381 is **always `undefined`**. The selected app is silently set to undefined after every successful fit check.

CURRENT BUG:
```typescript
next: (res) => {
  this.runningFitCheck.set(false);
  this.selectedApp.set(res.application); // UNDEFINED — always
  this.loadAllData();
}
```

FIX:
```typescript
next: (_fitScore) => {
  this.runningFitCheck.set(false);
  this.loadAllData(); // refresh list; re-find selectedApp from refreshed data if needed
}
```

---

**CRITICAL BUG (L505–508): `loadCognitoConfig()` uses different localStorage keys than `auth.service.ts`.**

`app.ts` reads keys: `cognitoUserPoolId`, `cognitoClientId`, `cognitoRegion` (camelCase, no underscores)
`auth.service.ts` writes keys: `cognito_user_pool_id`, `cognito_client_id`, `cognito_region` (snake_case with underscores)

And `app.ts:saveCognitoConfig()` writes camelCase keys, while auth.service reads snake_case keys.
**The Cognito config saved from the Settings tab is NEVER read by the auth service.** Pick one key scheme and use it everywhere.

---

**Problem (L511–515): `saveCognitoConfig()` in app.ts duplicates logic from `auth.service.ts`.**

`auth.service.ts` already has `saveCognitoConfig(userPoolId, clientId, region)`. app.ts re-implements it.

FIX — delegate to the service:
```typescript
protected saveCognitoConfig() {
  this.auth.saveCognitoConfig(this.cognitoUserPoolId, this.cognitoClientId, this.cognitoRegion);
  alert('Cognito parameters saved locally!');
}
```

---

**Problem (L29): `protected readonly Math = Math;` is unnecessary.**

In standalone Angular components, you can call `Math.max()` directly inside class methods without re-assigning `Math` as a property. This pattern was only needed in old NgModule template scopes. Remove line 29 and call `Math` directly in the methods.

**Problem (L299–303): Intermediate array in `getMaxStatusCount()` is unnecessary.**

CURRENT:
```typescript
const counts = [s.applied || 0, s.screening || 0, ...s.ghosted || 0];
return Math.max(...counts, 1);
```

SIMPLER:
```typescript
return Math.max(s.applied||0, s.screening||0, s.interview||0, s.offer||0, s.rejected||0, s.ghosted||0, 1);
```

---

### backend/src/routes/insights.js

**Problem (L25–26): Duplicate `$ne` keys overwrite each other silently.**

```javascript
// CURRENT — JS object deduplicates keys: second $ne overwrites first
{ $match: { userId, source: { $ne: null, $ne: '' } } }

// FIX — use $nin
{ $match: { userId, source: { $nin: [null, ''] } } }
```

**Problem (L18–33): Three separate aggregation round-trips for the same collection.**

Use a single `$facet` stage to run all three sub-pipelines in one DB call:
```javascript
const [facetResult] = await Application.aggregate([
  { $match: { userId } },
  {
    $facet: {
      statusGroups: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
      sourceGroups: [
        { $match: { source: { $nin: [null, ''] } } },
        { $group: { _id: '$source', count: { $sum: 1 } } }
      ],
      fitScoreAgg: [
        { $match: { 'fitScore.score': { $ne: null } } },
        { $group: { _id: null, avgScore: { $avg: '$fitScore.score' } } }
      ]
    }
  }
]);
const { statusGroups, sourceGroups, fitScoreAgg } = facetResult;
```
This reduces 3 DB round-trips to 1.

---

### backend/src/services/ghostingService.js

**Problem (L50–62): Sequential `await app.save()` inside a for loop blocks each iteration.**

For N ghosted candidates, this fires N sequential DB writes. Use bulkWrite instead:
```javascript
const toGhost = candidates.filter(app =>
  isThresholdExceeded(app.lastStatusChange, thresholdDays, referenceDate)
);

if (toGhost.length > 0) {
  await Application.bulkWrite(toGhost.map(app => ({
    updateOne: {
      filter: { _id: app._id },
      update: {
        $set: { status: 'ghosted', lastStatusChange: referenceDate },
        $push: {
          statusHistory: {
            status: 'ghosted',
            changedAt: referenceDate,
            reason: `Auto-ghosted: No update for ${thresholdDays} days (previously '${app.status}')`
          }
        }
      }
    }
  })));
}
return toGhost.length;
```

---

### backend/src/services/s3Service.js

**Problem (L53–61): Synchronous fs calls block the event loop in an async function.**

```javascript
// CURRENT — sync I/O
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
fs.writeFileSync(localFilePath, file.buffer);

// FIX — async fs
const fs = require('fs/promises');
await fs.mkdir(uploadDir, { recursive: true }); // recursive is idempotent, no existsSync needed
await fs.writeFile(localFilePath, file.buffer);
```

---

### backend/src/models/Config.js

**Problem (L9–12): Manual `updatedAt` field is never actually updated after creation.**

It just stores the creation date. Use `{ timestamps: true }` in schema options and remove the manual field, or rename it `createdAt` to accurately describe what it stores.

---

### backend/src/models/ResumeVersion.js

**Problem (L25–28): Manual `createdAt` field instead of Mongoose timestamps.**

Add `{ timestamps: true }` to schema options and remove the manual `createdAt`. Mongoose manages both `createdAt` and `updatedAt` automatically.

---

### backend/src/index.js

**Problem (L20): `require('path')` declared mid-file, out of order with other requires.**

Move `const path = require('path');` to the top of the file with the other require statements (lines 1–9).

---

### frontend/src/app/services/api.service.ts

**Dead methods — never called anywhere:**
- `getHealth()` (L25–27) — health endpoint is not polled from the frontend
- `getApplication(id)` (L39–41) — app fetches full list and filters client-side; single-app fetch is unused

Both are safe to delete.

---

### frontend/src/app/services/auth.service.ts

**Problem (L60–82): Artificial 500ms delay in `login()` and `signup()` has zero purpose.**

```typescript
// CURRENT — pointless delay makes login feel slow
login(email: string, password: string): Promise<boolean> {
  return new Promise((resolve) => {
    setTimeout(() => {
      // ... mock login logic ...
      resolve(true);
    }, 500); // ← why?
  });
}
```

FIX — remove the setTimeout entirely. Just return `Promise.resolve(true)` synchronously after setting state.

---

### frontend/src/app/app.html

**Problem (L67–73): SSO buttons (Google, GitHub) both call the mock `handleAuthSubmit()`.**

These appear to offer real SSO but trigger the same mock login as the form. They are misleading. Either remove them or add a comment marking them as demo-only.

**Problem (L381–683): Null-check for fitScore.score is repeated 3 times with inconsistent logic.**

Create a helper method in `app.ts` to format fit score and reuse it across template locations.

**Problem (L142): Three inline style properties conflict with `.main-content` CSS class.**

`style="padding: 0; display: flex; flex-direction: column;"` overrides the class. Move these to the class definition in styles.css and remove the inline style.

### frontend/src/index.html

**Problem (L5): Title is still the Angular CLI default placeholder.**

`<title>Frontend</title>` should be `<title>JobTrack — Job Application Tracker</title>`.

---

## REACT CONTAMINATION CHECK — CLEAN

No React code exists in any `.ts`, `.html`, `.js`, or `.css` source file in this project.

The only hits for "react" in the search were:
1. `backend/package-lock.json` — `react-is` is a transitive dependency of Jest. It is **not** imported or used in any application code.
2. `backend/src/services/fitCheckService.js` line 23 — the string `'react'` inside the `commonTechSkills` keyword array. This is correct — it is a technology skill name for the fit-scoring keyword overlap engine.

**The project is fully and correctly MEAN-stack only. No React migration is needed or applicable.**

---

## Summary Table

| Priority | File | Issue | Action |
|----------|------|-------|--------|
| CRITICAL | styles.css L781,1006 | `--border-radius-lg` undefined | Define or replace |
| CRITICAL | styles.css L783 | `--shadow-glass` undefined | Define or replace |
| CRITICAL | app.ts L381 | `res.application` always undefined after fit-check | Fix response mapping |
| CRITICAL | app.ts L505-514 | Cognito localStorage key mismatch | Unify key naming |
| DEAD | styles.css L638-675 | `.auth-container`, `.auth-panel`, `.auth-title` — orphaned | Delete |
| DEAD | styles.css L684-701 | `.skill-tag-*` — orphaned | Delete |
| DEAD | styles.css L703-761 | Full timeline system — orphaned | Delete |
| DEAD | styles.css L473-489 | `.badge-*` system — orphaned | Delete or use instead of pill |
| DEAD | styles.css L1063-1121 | Vercel nav-bar — orphaned | Delete |
| DEAD | api.service.ts L25-27 | `getHealth()` never called | Delete |
| DEAD | api.service.ts L39-41 | `getApplication(id)` never called | Delete |
| DUPLICATE | styles.css L890-896 | `.vercel-command-footer kbd` defined twice | Delete second copy |
| DUPLICATE | app.ts L511-515 | Cognito save duplicates auth.service logic | Delegate to service |
| COMPLEX | api.service.ts L29-36 | Manual query-string building | Use HttpParams |
| COMPLEX | insights.js L18-33 | 3 separate aggregation round-trips | Use $facet |
| COMPLEX | ghostingService.js L50-62 | Sequential app.save() in loop | Use bulkWrite |
| COMPLEX | s3Service.js L53-61 | Sync fs calls in async function | Use fs/promises |
| COMPLEX | auth.service.ts L60-82 | Pointless 500ms login/signup delay | Remove setTimeout |
| MINOR | index.html L5 | Title is placeholder "Frontend" | Update to real title |
| MINOR | index.js L20 | require('path') out of order | Move to top |
| MINOR | Config.js L9-12 | Manual updatedAt never updated | Use timestamps:true |
| MINOR | ResumeVersion.js L25-28 | Manual createdAt vs Mongoose timestamps | Use timestamps:true |
| MINOR | app.ts L29 | `protected readonly Math = Math` unnecessary | Remove |
| MINOR | app.html L67-73 | Fake SSO buttons call mock login | Remove or comment |
| MINOR | app.html L142 | Inline styles conflict with .main-content CSS | Move to CSS class |
| MINOR | insights.js L25 | Duplicate $ne keys overwrite silently | Use $nin |
