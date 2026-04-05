

## Plan: Migrate to Company-Based Multi-User Architecture

All tables have been renamed and RLS now uses `company_id` instead of `user_id`. The app currently references old table names and filters by `user_id`, so production data appears empty.

### Changes

**1. `src/lib/modeTable.ts`** — Flip naming convention
- `{base}_demo` → `demo_{base}`
- `{base}_prod` → `prod_{base}`

**2. `src/services/supplierService.ts`** — Rename tables, clean interface
- `"suppliers"` → `"prod_suppliers"` (6 occurrences)
- `"supplier_items"` → `"prod_supplier_items"` (2 occurrences)
- Remove `user_id` from `Supplier` interface (keep field in DB for audit, just remove from TypeScript type since it's no longer used for filtering)

**3. `src/services/supplierImportService.ts`** — Rename tables
- `"supplier_items"` → `"prod_supplier_items"` (2 occurrences)
- `"suppliers"` → `"prod_suppliers"` (1 occurrence)

**4. `src/services/jobMaterialsService.ts`** — Rename tables
- `"job_materials"` → `"prod_job_materials"` (4 occurrences)
- Join references `supplier_items` → `prod_supplier_items` and `suppliers` → `prod_suppliers` in the `.select()` join syntax

**5. `src/contexts/UserSettingsContext.tsx`** — Rename table, fix upsert
- `"user_settings"` → `"prod_user_settings"` (2 occurrences)
- **Remove** `.eq("user_id", user.id)` from the SELECT query (RLS handles it)
- **Keep** `user_id: user.id` in the upsert payload (it's part of the composite unique key `company_id + user_id`)
- **Do NOT** pass `company_id` (DB default handles it)

### Files NOT changed (auto-fixed by step 1)
These all use `getTable()`, so the prefix flip fixes them automatically:
- `src/services/dbDemoService.ts`
- `src/services/customerImportService.ts`
- `src/services/variationsService.ts`
- `src/services/servicingService.ts`

### No backend changes needed
The FastAPI backend passes the auth token — RLS handles everything server-side too.

