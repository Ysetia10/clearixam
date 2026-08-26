# Production operations

Live stack (free tier):

| Layer | Host | URL |
|-------|------|-----|
| Frontend | Vercel | https://clearixam.vercel.app |
| API | Render | https://clearixam-backend.onrender.com |
| Database | Supabase Postgres | Session pooler JDBC on Render |

---

## Cold start (Render free tier)

After ~15 minutes idle, Render spins the API down. The next request can take **~30–60s**.

Mitigations in this repo:

1. **Keep-warm + uptime** — `.github/workflows/prod-ops.yml` curls `/health` every ~5 minutes.
2. **Frontend** — production timeout 60s, network retries, health prefetch on load, and an “Starting the API…” banner while waiting.
3. **Upgrade path** — Render paid / always-on removes spin-down.

Workflow: **Production ops** (scheduled + `workflow_dispatch`). Failures notify via GitHub Actions (watch the repo / email notifications).

| Symptom | Likely cause |
|---------|----------------|
| Health succeeds after 30–90s | Cold start (keep-warm missed or first wake) |
| Health fails for minutes | Crash loop — check Render logs (DB URL, pooler, OOM) |
| Browser CORS error | Origin missing from `SecurityConfig` allowed list |

---

## Move database to Supabase

Render’s `db.*.supabase.co` host is often **IPv6-only**. Use the **Session pooler** (port 5432) so Render can connect.

1. Create a project on [Supabase](https://supabase.com).
2. Copy **Session pooler** credentials (not the direct host):
   - Host: `aws-0-<region>.pooler.supabase.com`
   - Port: `5432`
   - User: `postgres.<project-ref>`
   - Database: `postgres`
3. Export Render Postgres, then restore into Supabase (see `scripts/migrate-to-supabase.sh`).
4. On the Render API service, set:

```env
DATABASE_URL=jdbc:postgresql://aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require
DATABASE_USERNAME=postgres.<project-ref>
DATABASE_PASSWORD=<supabase-db-password>
DDL_AUTO=update
```

`SPRING_DATASOURCE_*` still works if you already use those names.

5. Restart the Render service and confirm `GET https://clearixam-backend.onrender.com/health` returns `{"status":"UP"}`.
6. After the app is healthy, you can delete the old Render Postgres instance.

> Do not use the Transaction pooler (port 6543) with Hibernate unless you keep `preparedStatementCacheQueries=0` and accept limited session features.

---

## Backups

Supabase free tier has limited automated backup retention. Monthly dump:

```bash
pg_dump -h aws-0-<region>.pooler.supabase.com \
  -U postgres.<project-ref> \
  -d postgres --no-owner --no-acl -Fc \
  -f "clearixam-$(date +%Y%m%d).dump"
```

Store the dump outside git.
