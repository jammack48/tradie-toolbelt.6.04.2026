

## Plan: Fix Login Flow, FAB Menu, and Quote Funnel

### Issues Identified

1. **Redundant ModePicker on login** — After login, `mode` is `null` (sessionStorage is empty), so `AppLayout` renders the `ModePicker` every time. For authenticated users, the mode should auto-set based on their saved user settings or persist across sessions (currently uses `sessionStorage` which clears on tab close).

2. **FAB menu has 3 items, should be 2** — "New Job" and "Charge Up" both navigate to `/new-job`. Remove "New Job", keep only "Charge Up" and "New Quote". Make buttons larger for mobile.

3. **"New Quote" shows "Quote not found"** — The `/quote/new` route works, but `QuotePage` with `id === "new"` renders the funnel. The issue is likely that `useDemoData().customers` returns empty in prod mode, so no customers load → user can't proceed → or the funnel completes but the resulting job object returns `null` from `getJobDetail`. Need to verify the funnel actually renders.

4. **Address doesn't auto-fill when picking a customer** — The `QuoteFunnel` already sets `address` from `c.address` in `handleSelectCustomer`. The issue is that `customers` from `useDemoData()` may have empty `address` fields in prod mode, or the customer data isn't loading at all.

### Changes

**1. `src/contexts/AppModeContext.tsx`** — Persist mode to `localStorage` instead of `sessionStorage`
- Change `STORAGE_KEY` to use `localStorage` so mode survives tab close
- On login, if a mode is already saved, skip the ModePicker automatically
- Authenticated users go straight to their last-used mode

**2. `src/App.tsx`** — Auto-set mode for authenticated users
- When `user` exists and `mode` is null, check if user settings indicate a default mode
- If settings loaded and mode still null, auto-set to `"manage"` (the default for account holders)
- Skip ModePicker entirely for logged-in users who had a previous mode

**3. `src/pages/WorkHome.tsx`** — Clean up FAB menu
- Remove "New Job" button (redundant with "Charge Up")
- Keep only "Charge Up" and "New Quote" (when permitted)
- Make buttons larger: increase padding, font size, and touch targets for mobile

**4. `src/components/quote/QuoteFunnel.tsx`** — Ensure address loads from customer
- The code already sets address from customer data in `handleSelectCustomer`
- Verify the customer objects from `useDemoData()` have address data populated
- No code change needed here if the data is correct — the real fix is ensuring prod customers load with addresses

### Technical Details

- Mode persistence moves from `sessionStorage` → `localStorage` with key `tradie-app-mode`
- For authenticated (non-demo) users, if no stored mode exists, default to `"manage"`
- FAB popover width increases from `w-64` to `w-72`, button padding from `py-3` to `py-4`, text from `text-base` to `text-lg`

