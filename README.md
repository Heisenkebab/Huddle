# Huddle

A [Next.js](https://nextjs.org) app backed by [Supabase](https://supabase.com).

## Prerequisites

- [Node.js](https://nodejs.org) 20+
- A Supabase database, either:
  - **Hosted:** a free project created at [database.new](https://database.new), or
  - **Local:** [Docker](https://docs.docker.com/get-docker/) running, for the Supabase CLI (already a dev dependency)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Set up the database

The schema lives in `supabase/migrations/`. Pick one of the options below.

**Option A: hosted Supabase project**

1. Create a project at [database.new](https://database.new).
2. Apply the migrations using **one** of these methods:
   - Open the project's **SQL Editor**, paste the contents of each file in `supabase/migrations/` (oldest first), and run it.
   - Or push them with the CLI:
     ```bash
     npx supabase login
     npx supabase link --project-ref <your-project-ref>
     npx supabase db push
     ```

**Option B: local Supabase (Docker)**

```bash
npx supabase start   # starts the local stack and applies migrations
```

When it finishes, it prints the local `Project URL` and `Publishable` key. You can print them again later with `npx supabase status`. To stop the stack, run `npx supabase stop`.

### 3. Configure environment variables

Create a `.env.local` file in the project root. Git ignores it, so every developer needs their own:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

- **Hosted:** click **Connect** in the Supabase dashboard, or open **Project Settings → API Keys**.
- **Local:** use the values from `npx supabase status`.

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project structure

| Path                     | Purpose                                                                 |
| ------------------------ | ----------------------------------------------------------------------- |
| `app/`                   | Next.js App Router pages and layouts                                    |
| `components/ui/`         | shadcn/ui components                                                    |
| `lib/supabase/server.ts` | Supabase client for Server Components, Server Functions, Route Handlers |
| `lib/supabase/client.ts` | Supabase client for Client Components (`"use client"`)                  |
| `supabase/migrations/`   | SQL migrations for the database schema                                  |
| `supabase/config.toml`   | Supabase CLI configuration for the local stack                          |

## Database changes

Create a new migration instead of editing an existing one:

```bash
npx supabase migration new <name>   # creates supabase/migrations/<timestamp>_<name>.sql
```

Apply it locally with `npx supabase db reset`, or to the hosted project with `npx supabase db push`.

## Learn more

- [Next.js documentation](https://nextjs.org/docs)
- [Supabase + Next.js quickstart](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- [Supabase CLI reference](https://supabase.com/docs/reference/cli/introduction)
