# Codebase Audit: Trimming the Fat ✂️

Based on your tech stack (Vercel + Clerk) and the goal of maintaining the **simplest possible code** (avoiding "AI slop" or spaghetti code), here is a breakdown of what files can be safely deleted ("yeeted") and what lines of code should be trimmed or rewritten.

---

## 1. Unnecessary Files to Yeet 🗑️

Since you are deploying on Vercel and using Clerk, you don't need Docker or local container orchestration. You can safely delete the following files:

### Deployment / Ops Files
* `docker-compose.yml` (Not needed for Vercel)
* `backend/Dockerfile` (Not needed for Vercel Serverless Functions)
* `frontend/Dockerfile` (Not needed for Vercel)

### Leftover / Temp Files
* `frontend/liquid_test.html` (Looks like a leftover test file)
* `.DS_Store` (macOS system file, should be added to `.gitignore` and deleted)
* `backend/uploads/1784368649096-Sriram_CV_TCS.pdf` (Sample/test resume, not needed in source control)

### Documentation (If the project is already built)
If you no longer need the planning documents and want a pristine repository, you can delete:
* `PRD.md`
* `API_SPEC.md`
* `SCHEMA.md`
* `TECHSTACK.md`
*(Note: Keep `README.md` for project context!)*

---

## 2. Unnecessary Lines & "AI Slop" to Trim 🍝

### A. `backend/src/routes/applications.js`
This file contains the most obvious "AI slop" and dead code.

1. **Dead Code (Lines 11-66)**: 
   There is a massive 55-line function called `extractTextFromRawPDFBuffer` that does complex Regex PDF parsing. **It is never actually called anywhere in the file.** 
   * **Action:** Delete the entire function.
2. **Unused Imports (Line 4)**: 
   `const { PdfReader } = require('pdfreader');` is imported but never used. 
   * **Action:** Delete this line.
3. **Hardcoded Fallback Hack (Lines 278-285)**:
   Inside `runFitScore`, if no CV text is found, the code injects a massive hardcoded string of your personal details (`"Durga Pavan Sriram Sannidhi..."`) as a fallback to force the demo to work. 
   * **Action:** Remove this block. Instead, handle the error gracefully like a normal API: 
     ```javascript
     if (!cvText || cvText.trim().length < 10) {
       return res.status(400).json({ error: 'Valid CV text is required.' });
     }
     ```

### B. `backend/src/index.js`
1. **Redundant Cron Jobs (Lines 4, 63-74)**:
   You have an endpoint `/api/cron/ghost-scan` designed for Vercel Cron. However, there is also a local `node-cron` implementation that runs recursively.
   * **Action:** `node-cron` is useless in serverless environments like Vercel because the instance spins down. Delete `const cron = require('node-cron');` and the entire `cron.schedule(...)` block. Stick solely to the Vercel cron endpoint.
2. **Express Server Boot (Lines 76-94)**:
   The database connection block has manual checks for `if (!process.env.VERCEL) { app.listen(...) }`. This is okay, but can be simplified for a beginner.

### C. `frontend/src/app/app.ts`
1. **Recursive Polling (Lines 128-176, 715-762)**:
   The methods `mountClerkSignIn` and `mountClerkUserProfile` use recursive `setTimeout` polling (retrying 10-15 times) and manual DOM wiping (`container.innerHTML = ''`) to force Clerk to render. This is classic "AI slop" to bypass race conditions.
   * **Action:** Rewrite this using Clerk's actual ready state/promises, or better yet, use a community Angular Clerk wrapper so you can just use a component like `<clerk-sign-in>` instead of manually mounting it to a `div` via raw JavaScript.
2. **Command Palette Keyboard Listener (Lines 185-235)**:
   The global `@HostListener` for `Cmd+K` and `F` is huge and does manual DOM node checking (`activeEl.tagName === 'INPUT'`). 
   * **Action:** If you want to keep the codebase beginner-friendly, consider extracting this massive block into a separate `CommandPaletteService` or removing it entirely if it's not a core feature.

---

### Summary of Simplification
By deleting the unused PDF regex parser, removing the local `node-cron` package, cleaning up the hardcoded CV text, and dropping Docker files, you will easily shed over 150+ lines of unnecessary boilerplate and make the project much closer to a clean, beginner-friendly Node/Angular app.
