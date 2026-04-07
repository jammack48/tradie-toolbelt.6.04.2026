

## Plan: Fix 3 Issues (FAB Menu, New Quote, Dark Mode Toggle)

### Issue 1: FAB Menu — Corrupted/duplicated JSX
**File:** `src/pages/WorkHome.tsx` (lines 19-65)

The FABMenu component has duplicated JSX — two sets of `PopoverContent`, two sets of buttons overlapping. This creates broken rendering. Fix: rewrite the FABMenu with clean markup — just two big push buttons ("New Job" and "New Quote"), no "Charge Up" third option, with large touch-friendly sizing.

### Issue 2: New Quote doesn't work
**File:** `src/pages/WorkHome.tsx` (same FABMenu)

The corrupted FABMenu JSX likely causes the "New Quote" button to malfunction or navigate incorrectly. The clean rewrite in Issue 1 fixes this — the button navigates to `/quote/new` which correctly triggers the QuoteFunnel. If the "Quote not found" screen persists after fixing the FAB, it's a separate routing issue — but the corrupt JSX is the most likely cause.

### Issue 3: Dark mode toggle reverts
**File:** `src/contexts/ThemeContext.tsx`

The `applyTheme` function uses `classList.toggle("light", !isDark)` — this adds `.light` class when NOT dark. The CSS uses `.light` as the selector for light-mode variables. The code looks correct in isolation. The likely problem: the Lovable preview script or HMR re-mounts the ThemeProvider, causing the `useState` initializer to re-read `localStorage`. If the `localStorage.setItem` in `setIsDark` hasn't flushed before the re-mount, it resets.

**Fix:** Add `requestAnimationFrame` or `queueMicrotask` in the `setIsDark` function to ensure `applyTheme` runs synchronously alongside the localStorage write, and also apply the theme directly in `setIsDark`/`setTheme` (not just via useEffect) to prevent flash-back:

```typescript
const setIsDark = (d: boolean) => {
  setIsDarkState(d);
  localStorage.setItem("isDark", String(d));
  applyTheme(theme, d); // immediate DOM update
};

const setTheme = (t: Theme) => {
  setThemeState(t);
  localStorage.setItem("theme", t);
  applyTheme(t, isDark); // immediate DOM update
};
```

### Files Modified (2 files only)
1. `src/pages/WorkHome.tsx` — Rewrite FABMenu with clean 2-button layout
2. `src/contexts/ThemeContext.tsx` — Add immediate DOM apply in setters

### What is NOT changed
Everything else stays untouched. No table changes, no service changes, no routing changes.

