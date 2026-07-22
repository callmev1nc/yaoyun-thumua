# Yaoyun Thu Mua

Bilingual (Vietnamese / Traditional & Simplified Chinese) procurement management system for import/procurement teams. Mirrors 3 paper forms — Purchase Order (Form 1), Delivery Note (Form 2), and Ledger (Form 3) — with A4 bilingual print output.

**Stack:** Next.js 16 · React 19 · TypeScript 5 · Tailwind v4 · shadcn/ui · Supabase (SSR + RLS) · next-intl · Vercel (sin1)

## Quickstart

```bash
cp .env.example .env.local   # then fill in Supabase project keys
npm install
npm run dev                   # → http://localhost:3000
npm run build                 # production build
```

## Docs

- `CLAUDE.md` — agent entry point (auto-loaded)
- `docs/ARCHITECTURE.md` — system architecture & request lifecycle
- `docs/DATABASE.md` — schema, migrations, RLS, money-math
- `docs/FEATURES.md` — business domain (PO, DN, Ledger, Directories, Auth)
- `docs/DEVELOPMENT.md` — running, building, deploying, i18n
- `docs/GOTCHAS.md` — known traps & accepted decisions

## Deployed

https://yaoyun.vercel.app (Supabase project `ltrhpsfaoeqksqahqvog`, region ap-southeast-1)
