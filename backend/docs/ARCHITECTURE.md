# Unified Authentication Manager – Backend Architecture

## Goals

- Zero-knowledge password vault (client-side crypto, server stores ciphertext).
- Device-bound security with asymmetric keys (Ed25519 default) for MFA push approvals.
- Strong, layered defense-in-depth: rate limiting, request signing, structured logging, audit trail.
- Operable platform: Dockerized services, CI-friendly scripts, observability hooks (Sentry, Prometheus).

## High-Level Components

| Component | Responsibilities | Tech Stack |
| --- | --- | --- |
| API Gateway | REST API, auth, routing, validation | Express + TypeScript, Helmet, Zod |
| Persistence | PostgreSQL via Prisma, Redis for queues/cache | Prisma ORM, BullMQ |
| Crypto Utils | PBKDF2/AES-256-GCM helpers, Ed25519 signature verification | Node `crypto`, `tweetnacl` |
| Push/MFA Service | Generates MFA challenges, publishes FCM payloads | BullMQ workers, Firebase Admin SDK |
| Email Relay Worker | Processes inbound alias traffic, forwards to destination | Nodemailer/SMTP client |
| Observability | Metrics, logging, tracing | Prom-client, pino, Sentry |

## Data Flow Overview

1. **Registration**
   - Client generates PBKDF2 salt + stores locally.
   - Backend stores hashed account password, PBKDF2 params, but *not* derived key.
2. **Device Registration**
   - Device sends public key + metadata + encrypted FCM token.
   - Backend persists device record and returns device ID.
3. **Vault CRUD**
   - Client encrypts entry with derived AES key.
   - Backend stores ciphertext + IV + JSON metadata only.
4. **MFA Push**
   - Backend creates `mfa_requests` row (challenge, payload, expiry) and enqueues push job.
   - Device receives push, signs payload, sends signature back.
   - Backend verifies signature with stored public key and updates status/audit log.
5. **Email Relay**
   - Alias creation stores alias + encrypted destination (or HMAC lookup token).
   - Worker decrypts destination (or resolves via HMAC) and relays mail.

## Modules

- `modules/auth`: registration, login, session rotation, refresh token hashing.
- `modules/devices`: public key registration, device lifecycle, FCM token storage (encrypted).
- `modules/vault`: CRUD endpoints, metadata filters, rate limiting per user.
- `modules/mfa`: request lifecycle, BullMQ job producers/consumers, signature validation.
- `modules/aliases`: alias CRUD, stats, relay webhook validation.
- `modules/relay-worker`: standalone worker for SMTP/SendGrid inbound events.
- `modules/observability`: metrics endpoint, Sentry bootstrap, request logging.

## Security Controls

- JWT access tokens (5 min) signed with rotating RSA/EC keys, refresh tokens hashed (Argon2id).
- Request signing middleware for critical endpoints (`/v1/mfa/response`, `/v1/relay/inbound`).
- Rate limits: global + per-route; device/IP aware for auth.
- Sanitized logging using pino redaction rules.
- Strict Content Security Policy + HSTS, TLS-first deployment guidance.

## Next Steps

1. Implement Express modular router structure matching modules above.
2. Add shared libraries (`src/lib/prisma`, `src/lib/redis`, `src/lib/crypto`).
3. Scaffold BullMQ queues + processor skeletons.
4. Flesh out tests (Vitest/Jest) for crypto + API flows.
5. Wire Docker Compose (api + worker + postgres + redis + maildev) and CI workflows.

This document anchors the backend roadmap and ensures every subsystem aligns with the zero-knowledge requirements before coding detailed features.


