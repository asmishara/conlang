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

## Scripts

| Command              | What it does                         |
| -------------------- | ------------------------------------ |
| `npm run dev`        | Start the dev server                 |
| `npm run build`      | Production build                     |
| `npm run lint`       | ESLint                               |
| `npm run typecheck`  | Generate route types and run `tsc`   |
| `npm test`           | Unit tests (Vitest)                  |
| `npm run db:migrate` | Create/apply Prisma migrations       |

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
