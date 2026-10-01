# Conlang Workshop

A website for creating and managing constructed languages: sound inventories,
lexicons, word generation, inflection tables and grammar notes.

Built with Next.js (App Router), TypeScript, Tailwind CSS, Prisma (Postgres)
and Auth.js.

## Getting started

Requirements: Node.js 22+ and a Postgres database (Docker is the easiest way).

```bash
npm install
cp .env.example .env        # then fill in AUTH_SECRET and at least one sign-in provider
docker compose up -d        # local Postgres on port 5432
npm run db:migrate          # create tables
npm run dev                 # http://localhost:3000
```

### Sign-in providers

Sign-in uses OAuth. Configure GitHub and/or Google in `.env`; providers without
credentials are hidden from the sign-in page.

- **GitHub:** create an OAuth app at https://github.com/settings/developers with
  callback URL `http://localhost:3000/api/auth/callback/github`.
- **Google:** create an OAuth client at https://console.cloud.google.com/apis/credentials
  with redirect URI `http://localhost:3000/api/auth/callback/google`.

## Deploying on Railway

The site runs on [Railway](https://railway.com) as a web service plus a Postgres
database. `railway.json` runs `npm run db:deploy` before each deploy, so new
tables and columns are created automatically; if that step fails, the previous
deploy keeps running.

1. Add a Postgres database to the Railway project.
2. In the web service's variables, set:
   - `DATABASE_URL` to `${{Postgres.DATABASE_URL}}`
   - `AUTH_SECRET` to a random string (`npx auth secret` makes one)
   - `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` and/or `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`
3. Give the service a public domain, then add its callback URL to each OAuth app,
   e.g. `https://your-app.up.railway.app/api/auth/callback/github`.

Sign-in uses the Railway domain automatically. If you add a custom domain, set
`AUTH_URL` to it (e.g. `https://conlang.example.com`) and use that domain in the
OAuth callback URLs instead.

## Scripts

| Command              | What it does                         |
| -------------------- | ------------------------------------ |
| `npm run dev`        | Start the dev server                 |
| `npm run build`      | Production build                     |
| `npm run lint`       | ESLint                               |
| `npm run typecheck`  | Generate route types and run `tsc`   |
| `npm test`           | Unit tests (Vitest)                  |
| `npm run db:migrate` | Create/apply Prisma migrations       |
| `npm run db:deploy`  | Apply migrations in production       |

## Project layout

```
prisma/schema.prisma      data model (users, sessions, languages)
src/auth.ts               Auth.js config
src/lib/db.ts             Prisma client
src/lib/*.ts              domain logic (pure, unit-tested)
src/app/                  pages and server actions
```

## Roadmap

- **M1:** phoneme inventory and orthography, lexicon, word generator
- **M2:** grammar pages, interlinear glosses, phonotactic validation
- **M3:** inflection paradigms, public sharing
- **M4:** sound change applier, collaboration
