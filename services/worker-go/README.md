# Gestion Del Fin - Go Worker

This service implements the `daily-rations` job in Go. It can run in two modes:

- Single-run: connects to Postgres, performs the daily-rations job once and exits (useful for ad-hoc runs or Railway Schedules).
- Daemon (queue) mode: listens on a Redis list (`jobs:daily_rations`) and processes jobs when they arrive; exposes a `/health` HTTP endpoint on port `8080`.

It performs the same inventory consumption and logging as `src/jobs/daily-rations.job.ts`, but runs independently so the API process is not blocked.

Design goals:
- No changes to the existing API code.
- Safe, idempotent DB operations inside transactions.
- Single-run mode (suitable to run from Railway "Run" or schedule).

Run locally:

```bash
export $(cat .env | xargs)
go run ./main.go
```

Build Docker image:

```bash
docker build -t gestion-del-fin-worker:local .
```

Notes:
- The worker reads `DATABASE_URL` and `CHILD_AGE`.
- For production scheduling, use Railway Schedules or an external scheduler to run this image.
 
Queue / Daemon mode
-------------------
To run as a daemon that consumes work from Valkey set `VALKEY_JOBS_URL` and run the service. Example:

```bash
export VALKEY_JOBS_URL=redis://:<password>@<host>:<port>
go run ./main.go
```

The API scheduler (`src/jobs/scheduler.ts`) will enqueue jobs to `jobs:daily_rations` when `VALKEY_JOBS_URL` is set in the API environment. This allows a safe migration: keep the old in-process job as fallback and enable queueing by setting `VALKEY_JOBS_URL`.
