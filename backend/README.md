# Unified Authentication Manager – Backend

Hardened Node.js/TypeScript API that powers the Unified Authentication Manager platform. The service exposes secure routes for registration, device enrolment, MFA push approvals, password vault CRUD, and email relay orchestration while enforcing zero-knowledge guarantees (the server only stores ciphertext).

## Highlights

- **Zero-knowledge vault**: AES-256-GCM blobs only, encrypted client-side.
- **Device-signed MFA**: BullMQ workers fan out FCM notifications and verify Ed25519 signatures.
- **Email relay**: Encrypted destination routing with stateless inbound webhook verification.
- **Observability**: Sentry error tracking + Prometheus `/metrics` endpoint + Grafana dashboard.
- **Infrastructure ready**: Multi-stage Docker image, docker-compose stack (Postgres, Redis, workers, Prometheus, Grafana), and GitHub Actions CI (lint, migrate, build, containerize).

## Local Development

```bash
# Install deps & generate Prisma client
npm install
npm run prisma:generate

# Apply migrations (creates dev DB schema)
npm run prisma:migrate

# Start API + worker in watch mode
npm run dev
npm run dev:worker
```

Environment variables live in `env.example`. Copy to `.env` (or use direnv) and fill in:

```bash
cp env.example .env
```

At minimum configure `DATABASE_URL`, `REDIS_URL`, `JWT_PRIVATE_KEY`, `JWT_PUBLIC_KEY`, and `ENCRYPTION_KEY`. Optional knobs (`FCM_SERVICE_ACCOUNT`, `SENTRY_DSN`, SMTP credentials) activate push notifications, observability, and relay forwarding.

## Useful Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Express server with `ts-node-dev` |
| `npm run dev:worker` | Queue worker (BullMQ) in watch mode |
| `npm run build` | Type-check & emit production JS to `dist/` |
| `npm start` | Run compiled API (`dist/index.js`) |
| `npm run start:worker` | Run compiled worker (`dist/workers/index.js`) |
| `npm run migrate:deploy` | Apply Prisma migrations (used in Docker / CI) |

## Docker & Compose

The repository ships with a production-like stack:

```bash
# Build images & start postgres, redis, backend, worker, prometheus, grafana
docker-compose up --build -d

# Follow logs
docker-compose logs -f backend

# Tear down
docker-compose down -v
```

Services included:

| Service | Port | Notes |
| --- | --- | --- |
| `backend` | 5000 | API (`/health`, `/metrics`, `/api/v1/*`) |
| `worker` | – | BullMQ worker (MFA push + relay forwarding) |
| `postgres` | 5432 | Persistent volume `postgres_data` |
| `redis` | 6379 | Backing store for queues and rate limiting |
| `prometheus` | 9090 | Scrapes `backend:5000/metrics` |
| `grafana` | 3000 | Pre-provisioned datasource + dashboard |

The Dockerfile is multi-stage (`node:18-alpine`), runs `npm ci`, generates the Prisma client, builds TypeScript, prunes dev dependencies, and emits a slim runtime image.

## Observability

- **Metrics**: `prom-client` instrumentation exposes request latency/throughput under `/metrics`. Prometheus config lives in `monitoring/prometheus.yml`. Grafana is preloaded with a basic latency/throughput dashboard (`monitoring/grafana/provisioning/dashboards/uam-overview.json`).
- **Sentry**: Provide `SENTRY_DSN` to enable request/error handlers. Structured logs run through `pino` with sensitive fields redacted.

## GitHub Actions CI/CD

`.github/workflows/ci.yml` runs on every PR/push:

1. **Lint**: Type-check with `tsc --noEmit`
2. **Test**: Spins up Postgres + Redis services, runs tests (if defined)
3. **Build**: Builds Docker image and pushes to GitHub Container Registry on `main` branch
4. **Deploy**: Production deployment steps (configure in workflow)

The workflow includes automated Docker image builds with multi-stage caching and pushes to `ghcr.io` for easy deployment.

## API Surface (high level)

| Route | Purpose |
| --- | --- |
| `POST /api/v1/auth/register` | Email registration (stores KDF params + salted hash) |
| `POST /api/v1/auth/login` | Password login → session + refresh token |
| `POST /api/v1/auth/refresh` | Rotate access/refresh tokens |
| `POST /api/v1/devices/register` | Register device public key + encrypted FCM token |
| `GET/POST/PUT/DELETE /api/v1/vault` | Store encrypted vault entries |
| `POST /api/v1/mfa/request` | Create MFA request + enqueue push |
| `POST /api/v1/mfa/response` | Device-signed approval |
| `POST /api/v1/aliases` | Create relay alias (DIRECT or HMAC_LOOKUP) |
| `POST /api/v1/relay/inbound` | Verified webhook from SMTP worker/provider |

See `openapi.yaml` for complete OpenAPI 3.0 specification. Refer to `docs/ARCHITECTURE.md` for deeper protocol details.

## Monitoring URLs

- Health: `http://localhost:5000/health`
- Metrics: `http://localhost:5000/metrics`
- Prometheus UI: `http://localhost:9090`
- Grafana UI: `http://localhost:3000` (default creds `admin/admin`)

## License

ISC

