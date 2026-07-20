# JobTrack — Design System v2 (Overhaul Brief)

Reference feel: **Framer meets Superhuman meets Apple's Liquid Glass**, with Watermelon UI's warmth and squircle geometry. Dense, information-rich, but never cluttered — density comes from smart layout, not cramped spacing.

## 1. Color System

Soft pastel accent palette for UI chrome, full saturation for charts:
```css
:root {
  /* Dark Mode (Default) */
  --bg-base: #0b0b0d;          /* near-black base */
  --bg-surface: #131316;        /* card/panel surface */
  --bg-surface-raised: #1a1a1f; /* modals, popovers */
  --bg-glass: rgba(255, 255, 255, 0.04); /* liquid-glass overlay base */

  --accent-primary: #a5b4fc;    /* soft periwinkle */
  --accent-secondary: #fbcfe8;  /* soft pink */
  --accent-success: #bbf7d0;    /* soft mint */
  --accent-warning: #fde68a;    /* soft amber */
  --accent-danger: #fecaca;     /* soft rose */

  --text-primary: #f4f4f5;
  --text-secondary: #a1a1aa;
  --text-tertiary: #71717a;

  --border-subtle: rgba(255, 255, 255, 0.08);
  --border-glass: rgba(255, 255, 255, 0.12);
}

[data-theme="light"] {
  --bg-base: #fafafa;
  --bg-surface: #ffffff;
  --bg-surface-raised: #f4f4f5;
  --bg-glass: rgba(0, 0, 0, 0.03);

  --accent-primary: #4f46e5;
  --accent-secondary: #db2777;
  --accent-success: #15803d;
  --accent-warning: #b45309;
  --accent-danger: #dc2626;

  --text-primary: #18181b;
  --text-secondary: #52525b;
  --text-tertiary: #a1a1aa;

  --border-subtle: rgba(0, 0, 0, 0.08);
  --border-glass: rgba(0, 0, 0, 0.12);
}
```

## 2. Shape Language — Apple Squircle Everywhere
- Squircle geometry across cards, buttons, modals, and badges (`corner-shape: squircle` / smooth border radius ~14-16px).

## 3. Liquid Glass Effect
- High-level elevated surfaces (Modals, Cmd+K palette, Dropdowns, Top bar):
```css
background: rgba(255, 255, 255, 0.05);
backdrop-filter: blur(20px) saturate(180%);
-webkit-backdrop-filter: blur(20px) saturate(180%);
border: 1px solid var(--border-glass);
box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.1);
```

## 4. Navigation
- Top Bar (Vercel-style): Breadcrumb page indicator, workspace branding, user menu, light/dark mode toggle.
- Sidebar (Claude-desktop style): Icon + label items, collapsible, soft active pill.
- Cmd+K Command Palette: Global shortcut, fuzzy search, navigation actions.

## 5. Motion & Transitions
- Smooth 150-200ms ease transitions across page changes, hover states, and modals.
