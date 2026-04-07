

## Fix: Login Using Wrong Supabase Instance

### Problem
`src/pages/LoginPage.tsx` line 3 imports from `@/integrations/supabase/client` (Lovable Cloud's Supabase — `ttpndqaghjuoqnngdwlh`). Your real users and auth live on the external instance (`qrkojbfayjrtrlrmgzry`). So every login attempt hits the wrong database → "Invalid login credentials".

### Fix (1 file, 1 line)

**`src/pages/LoginPage.tsx`** — Change the import:
```typescript
// Before
import { supabase } from "@/integrations/supabase/client";

// After
import { supabase } from "@/lib/supabase";
```

That's it. No other changes needed.

