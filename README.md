# 🎡 Spinner Picker

A spinner picker wheel that **won't repeat a choice within a configurable
window**. Spin for a weighted-random pick that skips whatever came up in the last
_N_ spins, manage as many wheels as you like, edit options live, and review or
prune your pick history.

- **Backend** — TypeScript + [Hono](https://hono.dev), data in a local SQLite
  file (via `better-sqlite3`). No ORM, no extra framework.
- **Frontend** — React + Vite + framer-motion. Animated SVG wheel, dark UI.
- **Config** — everything is environment-driven with sensible defaults; nothing
  is hard-coded.

## Quick start

```bash
# 1. install (once, from the repo root — installs both workspaces)
npm install

# 2. run the two servers (separate terminals)
npm run dev:backend     # API  → http://localhost:8787
npm run dev:frontend    # SPA  → http://localhost:5173
```

Open the printed frontend URL. A sample "Lunch Roulette" wheel is seeded on first
run, so you can spin immediately.

## Configuration

All settings are environment variables with defaults — override by copying
`.env.example` into `backend/.env` and `frontend/.env`, or by exporting them.

| Variable         | Side     | Default                 | Purpose                              |
| ---------------- | -------- | ----------------------- | ------------------------------------ |
| `HOST`           | backend  | `127.0.0.1`             | API bind interface                   |
| `PORT`           | backend  | `8787`                  | API port                             |
| `DATABASE_PATH`  | backend  | `./data/spinner.db`     | SQLite file (relative to `backend/`) |
| `CORS_ORIGIN`    | backend  | `http://localhost:5173` | Allowed origins (comma-sep, or `*`)  |
| `VITE_API_URL`   | frontend | `http://localhost:8787` | API base URL used by the browser     |
| `FRONTEND_HOST`  | frontend | `127.0.0.1`             | Vite dev host                        |
| `FRONTEND_PORT`  | frontend | `5173`                  | Vite dev port                        |

> If you change `PORT`, update `VITE_API_URL` to match. If you change
> `FRONTEND_PORT`, update `CORS_ORIGIN` to match.

## How the "no-repeat" pick works

Each wheel has a **no-repeat window** _N_. On spin, the backend excludes the _N_
most recently picked options, then makes a **weighted** random choice among the
rest (each option has a `weight`). If _N_ is ≥ the number of options, it's
automatically clamped so at least one option is always eligible. Selection and
history recording happen in a single SQLite transaction. See
[`backend/src/lib/picker.ts`](backend/src/lib/picker.ts).

## API

Base path `/api`. Success responses are `{ "data": ... }`; errors are
`{ "error": { "code", "message" } }`.

| Method   | Path                          | Description                          |
| -------- | ----------------------------- | ------------------------------------ |
| `GET`    | `/health`                     | Liveness check                       |
| `GET`    | `/api/wheels`                 | List wheels (with options)           |
| `POST`   | `/api/wheels`                 | Create a wheel                       |
| `GET`    | `/api/wheels/:id`             | Get a wheel with options             |
| `PATCH`  | `/api/wheels/:id`             | Update name / no-repeat window       |
| `DELETE` | `/api/wheels/:id`             | Delete a wheel (cascades)            |
| `POST`   | `/api/wheels/:id/spin`        | Spin → pick + record history         |
| `GET`    | `/api/wheels/:id/options`     | List a wheel's options               |
| `POST`   | `/api/wheels/:id/options`     | Add an option                        |
| `PATCH`  | `/api/options/:id`            | Edit label / color / weight / order  |
| `DELETE` | `/api/options/:id`            | Remove an option                     |
| `GET`    | `/api/wheels/:id/history`     | List pick history (`?limit=`)        |
| `DELETE` | `/api/wheels/:id/history`     | Clear a wheel's history              |
| `DELETE` | `/api/history/:id`            | Delete one history entry             |

## Project layout & conventions

See [AGENTS.md](AGENTS.md) for the full architecture, layering rules, and the
checklist to follow when adding a feature.

## Production build

```bash
npm run build           # builds backend (tsc) and frontend (vite)
npm run start:backend   # node dist/index.js
npm run start:frontend  # vite preview (or serve frontend/dist with any static host)
```

## License

See [LICENSE](LICENSE).
