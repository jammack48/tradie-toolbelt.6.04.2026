# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## Infrastructure & Accounts

| Service | Purpose | Login / Account |
|---------|---------|-----------------|
| **Lovable** | Frontend hosting, IDE, deployment | macieinvestments |
| **Supabase (Personal Project)** | Auth + app data (single source of truth) | jamie@thermalvolt.co.nz |
| **Render** | Backend server (FastAPI) | jamie@ostelelectrical.co.nz |

### Notes
- Render backend URL: `https://tradie-toolbelt-server.onrender.com`
- Supabase URL: configure via `VITE_SUPABASE_URL` in your environment
- Backend currently only serves a health-check endpoint — no business logic yet
- Add new services to this table as they are introduced

### Frontend Environment Variables (required)

Set these for local/dev/prod builds so the app uses only your Supabase project:

| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL` | Your personal Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your personal Supabase anon/public key |

The app intentionally blocks a known Lovable Cloud project ref at runtime to prevent accidental split-database usage.

### Render Environment Variables
The FastAPI backend on Render requires these env vars:

| Variable | Value | Where to find |
|----------|-------|---------------|
| `SUPABASE_URL` | `https://sbthgkcmbxjgaqvntjja.supabase.co` | Supabase project URL |
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

# Step 4: Start the development server with auto-reloading and an instant preview.
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
