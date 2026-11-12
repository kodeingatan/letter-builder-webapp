# AGENTS.md

This repository is a Next.js 15 application for generating letter/documents from structured data, reusable document components, and admin-driven workflows. See [README.md](README.md) for the full product overview and deployment notes.

## Project shape

- App router entry points live under [src/app](src/app).
- Feature logic and business rules live under [src/features](src/features).
- Shared UI primitives live under [src/components](src/components).
- Database access and migration logic live under [src/lib/db](src/lib/db).
- Document rendering and template evaluation logic live under [src/lib/documents](src/lib/documents).

## Core conventions

- Prefer the existing App Router + route-handler pattern for backend work. API routes should live under [src/app/api](src/app/api) and keep validation close to the boundary.
- Validate incoming payloads with `zod` at the API or feature boundary before touching the database.
- Reuse the existing database access pattern from [src/lib/db/index.ts](src/lib/db/index.ts): single shared SQLite connection, `getDb()`, and `resetDatabase()` for tests or local resets.
- Keep business logic in feature modules such as [src/features/surat/server.ts](src/features/surat/server.ts), rather than embedding DB logic directly into pages or components.
- Preserve the app’s determinism: document expressions are evaluated through the document engine, not by `eval()` or `Function`.
- Follow the existing security pattern for protected routes and admin-only mutations: verify origin and role checks before mutating master data or settings.

## Important workflows

- Development: `npm run dev`
- Production build: `npm run build`
- Type checking: `npm run typecheck`
- Local DB reset: `npm run db:reset`

Use `DATABASE_PATH` only when overriding the default SQLite location. The default database file is `data/letter-builder.db`.

## Local environment notes

- This app is designed for a persistent local filesystem and is not a serverless-friendly SQLite deployment model.
- Windows dev environments may need build tooling for `better-sqlite3`; if native compilation fails, install the Visual Studio Build Tools or use the project’s supported Node setup.
- Seed data and demo accounts are initialized automatically when the database is empty.

## Recommended coding guidance

- Prefer small, feature-oriented changes that match the current file layout.
- Reuse the established types, entities, and helpers instead of creating parallel patterns.
- If you add a new API route, mirror the surrounding error handling and JSON response conventions from the existing handlers.
- When editing schema or database logic, keep migrations idempotent and backwards-compatible with the existing SQLite setup.

## Product docs and design references

Use these as the canonical product and UX references before proposing new workflows or UI patterns:

- [README.md](README.md)
- [docs/PRD Document & Correspondence Generation Platform.md](docs/PRD%20Document%20&%20Correspondence%20Generation%20Platform.md)
- [docs/DESIGN-notion.md](docs/DESIGN-notion.md)

## References

- [README.md](README.md)
- [src/lib/db/index.ts](src/lib/db/index.ts)
- [src/lib/db/schema.ts](src/lib/db/schema.ts)
- [src/features/surat/server.ts](src/features/surat/server.ts)
- [src/app/api/auth/login/route.ts](src/app/api/auth/login/route.ts)
