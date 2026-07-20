# UI/UX Overhaul Specification — JobTrack

This document details the issues in the current UI implementation (revealed in visual audits and screenshots) and outlines the design improvements, CSS adjustments, and HTML refactorings needed to transition the interface from an unpolished look to a premium, modern dashboard.

---

## 1. Identified Issues (Visual Audit & User Feedback)

### A. Broken Icons (Font Awesome Version Mismatch)
* **Symptom**: The sidebar navigation items and top action bar buttons are missing icons or rendering empty boxes.
* **Root Cause**: The HTML file loads the Font Awesome v6 CDN link, but the templates utilize outdated Font Awesome v4 syntax (e.g., `fa fa-dashboard`, `fa fa-columns`, `fa fa-cog`).
* **Fix**: Update all classes to standard Font Awesome v6 solid format (`fa-solid fa-[icon-name]`).

### B. High-Saturation Purple Accent ("AI Slop" Vibe)
* **Symptom**: The heavy purple gradient (`#6366f1` to `#a855f7`) and saturated purple buttons/tabs give the application a generic, template-like AI aesthetic.
* **Fix**: **Completely remove the purple theme.** Shift to a refined, professional SaaS color palette:
  - **Base Background**: Deep titanium/slate black (`#090a0f` to `#0e1017`).
  - **Panel Background**: Frosted dark glass (`rgba(17, 20, 28, 0.55)`).
  - **Accent Theme**: Steel Blue (`#2563eb` / `#3b82f6`) and Clean Teal/Cyan (`#0d9488` / `#14b8a6`) for highlights.
  - **Muted Colors**: Slate grey (`#64748b` / `#94a3b8`) for secondary elements.

### C. Generic Fonts
* **Symptom**: The default typography looks clean but lacks high-end editorial and interface precision.
* **Fix**: Replace all font references with **Plus Jakarta Sans** (for geometric elegance) or **Inter** (for UI precision). 

### D. Stretched User Profile Avatar & Text Overflows
* **Symptom**: The user profile avatar container is a vertically stretched oval rather than a perfect circle. The "LOGOUT" text is raw, capital letters placed next to a broken icon, crowding the footer space.
* **Fix**:
  - Add `aspect-ratio: 1 / 1` and explicit `width`/`height` variables to force the avatar into a **perfect circle**.
  - Replace the text "LOGOUT" with a simple, clean door-exit icon button (`fa-solid fa-right-from-bracket`) styled in muted red on hover.

### E. Blocky Dialogs & Heavy Input Borders (Modal View)
* **Symptom**: The "Log Application" modal has sharp edges, stark black background text fields, and a heavy solid purple submission button.
* **Fix**:
  - Curve the dialog borders (`border-radius: 20px`).
  - Upgrade the input fields to a softer slate background with fine border glows.
  - Apply the new Steel Blue/Cyan gradient to the submission button and add a clean border style for the "Cancel" option.

### F. Low-Visibility Kanban Columns & Cards (Kanban View)
* **Symptom**: The Kanban columns blend into the background due to flat grey lines, and card metadata feels cramped.
* **Fix**:
  - Add **stage-specific top border accents** (e.g., blue for Applied, teal for Screening, orange for Interview, green for Offer, red for Rejected, slate for Ghosted).
  - Add **headers with custom v6 icons** for each stage.
  - Format the card's fit score as a clean colored badge instead of raw text.

---

## 2. Refined Color & Typography Tokens

We will replace the stylesheet definitions in `styles.css` with the following variables:

```css
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');

:root {
  --font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  
  /* Refined Titanium Slate Theme */
  --bg-gradient: radial-gradient(circle at top right, #111422 0%, #080a0f 60%, #040508 100%);
  --panel-bg: rgba(14, 17, 27, 0.6);
  --panel-border: rgba(255, 255, 255, 0.05);
  --panel-blur: blur(20px) saturate(130%);
  
  /* Classy Steel Blue / Teal Accents */
  --accent-color: #3b82f6;
  --accent-gradient: linear-gradient(135deg, #2563eb 0%, #0d9488 100%);
  --accent-glow: rgba(37, 99, 235, 0.15);
  
  /* Status Colors */
  --color-applied: #3b82f6;       /* Steel Blue */
  --color-screening: #0d9488;     /* Teal */
  --color-interview: #d97706;     /* Amber */
  --color-offer: #059669;         /* Emerald */
  --color-rejected: #dc2626;      /* Crimson */
  --color-ghosted: #475569;       /* Slate */
  
  --text-primary: #f8fafc;
  --text-secondary: #94a3b8;
  --text-muted: #475569;
}
```

---

## 3. UI/UX Component Specifications

### Profile Footer Redesign
```html
<div class="user-profile">
  <div class="avatar">SA</div>
  <div class="user-info">
    <span class="user-name">sannidhisriram8</span>
    <span class="user-email">sannidhisriram8@gmail.com</span>
  </div>
  <button class="logout-btn" (click)="handleLogout()" title="Sign Out">
    <i class="fa-solid fa-right-from-bracket"></i>
  </button>
</div>
```
```css
/* Circular Avatar & Muted Logout Icon */
.avatar {
  width: 40px;
  height: 40px;
  aspect-ratio: 1 / 1;
  border-radius: 50%;
  background: var(--accent-gradient);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  flex-shrink: 0;
}
.logout-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}
.logout-btn:hover {
  background: rgba(220, 38, 38, 0.1);
  color: #ef4444;
}
```

### Dynamic SVG Bar Chart
The bar chart heights will be calculated dynamically relative to the maximum count:
```html
<!-- Applied -->
<rect x="75" [attr.y]="180 - getBarHeight(stats().byStatus.applied)" width="50" [attr.height]="getBarHeight(stats().byStatus.applied)" fill="var(--color-applied)" rx="4" />
```

### Kanban Column Accent Gradients
Each Kanban column will have a distinct colored indicator line at the top:
```css
.kanban-column {
  border-top: 3px solid var(--column-accent-color);
  background: rgba(14, 17, 27, 0.3);
  border-radius: 12px;
  padding: 16px 12px;
  min-height: 600px;
}
```

---

## 4. Implementation Steps (To Execute Next)

1. **Update [app.ts](file:///Users/sannidhidurgapavansriram/Sriram/LPU/Summer%20PEP/Job%20Track/frontend/src/app/app.ts)**: Implement `getMaxStatusCount()` and `getBarHeight(count)`.
2. **Update [app.html](file:///Users/sannidhidurgapavansriram/Sriram/LPU/Summer%20PEP/Job%20Track/frontend/src/app/app.html)**:
   - Apply Font Awesome v6 classes globally.
   - Refactor metrics icons, status charts, user profiles, and column header layouts.
   - Replace old dialog modals with right slide-over panel sections.
3. **Update [styles.css](file:///Users/sannidhidurgapavansriram/Sriram/LPU/Summer%20PEP/Job%20Track/frontend/src/styles.css)**: Implement the Plus Jakarta Sans typography, clean out the old purple style tokens, and apply the slate-blue/teal theme.
