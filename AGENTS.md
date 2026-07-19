# AGENTS.md

Conventions and reusable patterns for the Spinner Picker codebase. Read this
before adding a feature so patterns stay consistent and code isn't duplicated.

## What this project is

A spinner picker wheel that avoids repeating a choice within a configurable
"no-repeat window". A Hono + SQLite backend owns all data and the selection
logic; a React + Vite frontend renders and animates the wheel.

## Repository layout

```
.
├── package.json          # npm workspaces + root run scripts
├── .env.example          # documents every env var (backend + frontend)
├── backend/              # Hono API over a local SQLite file
│   └── src/
│       ├── config.ts     # ALL env access lives here (never read process.env elsewhere)
│       ├── index.ts      # app wiring: middleware, router mounts, error handler
│       ├── types.ts      # domain types (camelCase)
│       ├── db/           # connection singleton + schema.sql + seed
│       ├── lib/          # pure helpers: errors, validation, picker, palette
│       ├── repositories/ # ALL SQL lives here; maps snake_case <-> camelCase
│       ├── services/     # cross-entity / transactional use-cases
│       └── routes/       # thin HTTP handlers; no SQL, no business logic
└── frontend/             # React + Vite SPA
    └── src/
        ├── api/          # typed client (client.ts) + response types (types.ts)
        ├── lib/          # pure helpers (wheel geometry)
        ├── components/   # presentational React components
        ├── App.tsx       # single stateful orchestrator
        └── styles.css    # one global stylesheet with :root design tokens
```

## Running (two commands + one install)

```bash
npm install            # once, from the repo root (installs both workspaces)
npm run dev:backend    # terminal 1 → API on $PORT (default 8787)
npm run dev:frontend   # terminal 2 → SPA on $FRONTEND_PORT (default 5173)
```

`npm run build` builds both. `npm run start:backend` / `start:frontend` serve
the built output.

## Configuration — never hard-code

- Every configurable value comes from an environment variable **with a default**.
- Backend: read them **only** in `backend/src/config.ts`. Import `config` from
  there. Adding a setting = add a parsed field in `config.ts` + document it in
  `.env.example` (root and `backend/.env.example`).
- Frontend: the API base URL is `import.meta.env.VITE_API_URL`, read **only** in
  `frontend/src/api/client.ts`. Dev host/port come from `FRONTEND_HOST` /
  `FRONTEND_PORT` in `vite.config.ts`. Vite only exposes vars prefixed `VITE_`
  to the browser.

## Backend patterns

### Layering (strict, one direction)
`routes → services → repositories → db`. Never skip a layer upward.
- **routes/**: parse & validate input, call a service or repository, return via
  `ok(c, data)`. No SQL, no `db` import, no business rules.
- **services/**: logic spanning multiple repositories or needing a transaction
  (e.g. `spinWheel`). Compose repositories here.
- **repositories/**: the *only* place with SQL. Each exports a single `xxxRepo`
  object. Rows are `snake_case`; every repo maps to `camelCase` domain types via
  a private `mapRow`. Never leak a raw row past this layer.
- **db/index.ts**: the connection singleton + `now()` (single source of "now")
  + `initializeDatabase()` (idempotent schema apply + first-run seed).

### Errors & responses
- Throw `ApiError` (`lib/errors.ts`) — use the factories: `ApiError.badRequest`,
  `.notFound`, `.conflict`, `.unprocessable`. Never build error JSON by hand.
- The **only** error shaper is `app.onError` in `index.ts`. It emits
  `{ error: { code, message } }`.
- Success always returns `{ data }` via the `ok(c, data, status?)` helper.

### Validation
- Use the helpers in `lib/validation.ts` (`asObject`, `requireString`,
  `optionalString`, `optionalInt`, `optionalNumber`, `parseId`). They throw
  `ApiError.badRequest` on failure — no try/catch needed in handlers.
- We intentionally do **not** use a schema library; payloads are small. If a new
  field type recurs, add a helper here rather than inlining checks.

### Selection logic
- The no-repeat weighted-random algorithm lives in `lib/picker.ts` and is
  **pure** (RNG is injectable). Keep it free of DB/HTTP concerns so it stays
  testable. Persistence + transaction wrapping belong in `services/wheelService.ts`.

## Frontend patterns

- **All** network calls go through `api` in `src/api/client.ts`. Components never
  call `fetch`. The client unwraps the `{ data }` envelope and throws `ApiError`.
- `App.tsx` is the single source of state and the only place that calls `api.*`.
  Components are presentational: they receive data + callbacks as props and raise
  intent. Keep new components dumb; put orchestration in `App`.
- Wrap every API call in `App`'s `run(fn)` helper so errors surface as a toast
  instead of throwing into render.
- The wheel is **controlled**: `App` owns `rotation`/`spinning`; `Wheel.tsx` is
  pure presentation and calls `onSpinEnd` when the CSS transition finishes. Spin
  math is in `lib/wheelGeometry.ts` (pure) — reuse `rotationForIndex`, don't
  reimplement angle math.
- Styling: one global `styles.css`. Use the `:root` CSS variables (colors,
  radius, shadow) — don't introduce ad-hoc hex values in components. Class names
  are plain kebab-case; no CSS-in-JS.
- Animations use `framer-motion` for enter/exit/layout; the wheel spin itself is
  a plain CSS transition (cheaper, and we need the `transitionend` signal).

## Data model

- `wheels` (id, name, no_repeat_window, timestamps)
- `options` (id, wheel_id→wheels, label, color, weight, position, timestamps)
- `history` (id, wheel_id→wheels, option_id→options **nullable**, option_label
  snapshot, created_at)

Deleting a wheel cascades to its options and history. Deleting an option sets
its history rows' `option_id` to NULL but keeps the snapshotted `option_label`,
so history survives option removal.

## Conventions checklist for a new feature

- [ ] New config? → `config.ts` + both `.env.example` files, with a default.
- [ ] New data access? → a repository method with `snake_case`↔`camelCase` mapping.
- [ ] Cross-entity/transactional? → a service function, not a route.
- [ ] Input validation? → helpers in `lib/validation.ts`.
- [ ] Errors? → throw `ApiError`; success? → `ok(c, data)`.
- [ ] New API call on the client? → add to `api` in `client.ts`, typed.
- [ ] New UI? → presentational component + wiring in `App.tsx`.
- [ ] Colors/spacing? → `:root` tokens in `styles.css`.
