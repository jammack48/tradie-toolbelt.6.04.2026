# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## Infrastructure & Accounts

| Service | Purpose | Login / Account |
|---------|---------|-----------------|
| **Lovable** | Frontend hosting, IDE, deployment | macieinvestments |
| **Supabase** | Database, auth, demo session data | jamie@thermalvolt.co.nz |
| **Render** | Backend server (FastAPI) | jamie@ostelelectrical.co.nz |

### Notes
- Supabase project URL: `https://qrkojbfayjrtrlrmgzry.supabase.co`
- Frontend uses **`VITE_EXT_SUPABASE_URL`** and **`VITE_EXT_SUPABASE_ANON_KEY`** (publishable or legacy anon JWT). Set these locally in `.env` and in the Lovable project environment so the app does not use Lovable’s default Supabase pairing.
- **Logged-in users**: After sign-in, the app loads `prod_user_settings` (and creates a row for your `user_id` if missing). Set **`company_id`** on that row to your company UUID so the app loads **`prod_customers`** and **`prod_supplier_items`** instead of demo tables. Workspace choice (Office / On the tools / Timesheet) is stored in **`business_profile`** as `lastWorkspaceMode` (`manage` | `work` | `timesheet` | …) and optional `trade`.
- Render backend URL: `https://tradie-toolbelt-server.onrender.com`
- The FastAPI **`/health`** probe queries **`prod_user_settings`** (service role). If the Backend panel shows **`db: not_reported`** or **`query_failed`**, set **`SUPABASE_URL`** + **`SUPABASE_SERVICE_KEY`** (legacy `service_role` JWT) on Render and redeploy. **`Database: unknown`** in older builds meant the JSON had no `db` field; current frontend shows **`not_reported`** instead.
- Add new services to this table as they are introduced

### Local frontend (`.env`)

| Variable | Description |
|----------|-------------|
| `VITE_EXT_SUPABASE_URL` | `https://qrkojbfayjrtrlrmgzry.supabase.co` |
| `VITE_EXT_SUPABASE_ANON_KEY` | Supabase Dashboard → API Keys → publishable or anon key |

### Render Environment Variables
The FastAPI backend on Render requires these env vars:

| Variable | Value | Where to find |
|----------|-------|---------------|
| `SUPABASE_URL` | `https://qrkojbfayjrtrlrmgzry.supabase.co` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Legacy `service_role` JWT (starts with `eyJ...`) | Supabase Dashboard → Settings → API Keys → Legacy anon, service_role |

**Important**: Do NOT use the publishable/anon key. Do NOT use new-format keys starting with `sb_secret_...` — the current Python SDK requires the legacy JWT.

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Copy env template and fill in keys.
cp .env.example .env

# Step 5: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
