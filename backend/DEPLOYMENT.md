# Deployment Guide

Production deployment guide for Unified Authentication Manager backend.

## Prerequisites

- Docker and Docker Compose installed
- PostgreSQL 15+ (or use managed service)
- Redis 7+ (or use managed service)
- Node.js 18+ (for local development)
- SSL certificates (for production HTTPS)

## Environment Variables

Copy `env.example` to `.env` and configure all required variables:

```bash
cp env.example .env
# Edit .env with your production values
```

### Required Variables

- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `JWT_PRIVATE_KEY`: RSA private key (PEM format)
- `JWT_PUBLIC_KEY`: RSA public key (PEM format)
- `ENCRYPTION_KEY`: 64-character hex string for encryption
- `RELAY_ENCRYPTION_KEY`: 64-character hex string for relay encryption
- `RELAY_WEBHOOK_SECRET`: HMAC secret for relay webhook verification
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`: SMTP configuration
- `FCM_SERVER_KEY` or `FCM_SERVICE_ACCOUNT`: Firebase Cloud Messaging credentials

### Optional Variables

- `SENTRY_DSN`: Sentry error tracking
- `HTTPS_ENABLED`: Enable HTTPS (requires SSL certificates)
- `SSL_KEY_PATH`, `SSL_CERT_PATH`: Paths to SSL certificate files
- `CORS_ORIGIN`: Comma-separated list of allowed origins

## Docker Deployment

### Local Development

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend worker

# Stop services
docker-compose down
```

### Production Deployment

1. **Configure environment variables** in `.env`

2. **Build and start services:**
   ```bash
   docker-compose build
   docker-compose up -d
   ```

3. **Run database migrations:**
   ```bash
   docker-compose exec backend npx prisma migrate deploy
   ```

4. **Verify health:**
   ```bash
   curl http://localhost:5000/health
   ```

## Kubernetes Deployment

See `k8s/` directory for Kubernetes manifests (if provided).

### Quick Start

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/redis.yaml
kubectl apply -f k8s/backend.yaml
kubectl apply -f k8s/worker.yaml
kubectl apply -f k8s/ingress.yaml
```

## AWS Deployment (ECS/EKS)

### ECS Fargate

1. Build and push image to ECR:
   ```bash
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com
   docker build -t uam-backend .
   docker tag uam-backend:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/uam-backend:latest
   docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/uam-backend:latest
   ```

2. Create ECS task definition with environment variables from Secrets Manager

3. Create ECS service with auto-scaling

### EKS

Use the Kubernetes deployment approach with EKS cluster.

## Database Setup

### Using Docker PostgreSQL

```bash
docker-compose up -d postgres
docker-compose exec postgres psql -U admin -d unified_auth
```

### Using Managed PostgreSQL (AWS RDS, DigitalOcean, etc.)

1. Create PostgreSQL instance with encryption at rest enabled
2. Configure security groups/firewall to allow backend access
3. Update `DATABASE_URL` in `.env`
4. Run migrations:
   ```bash
   npx prisma migrate deploy
   ```

## Redis Setup

### Using Docker Redis

```bash
docker-compose up -d redis
```

### Using Managed Redis (AWS ElastiCache, DigitalOcean, etc.)

1. Create Redis instance with encryption in transit
2. Update `REDIS_URL` in `.env`
3. Ensure backend can reach Redis instance

## Monitoring

### Prometheus & Grafana

Monitoring stack is included in `docker-compose.yml`:

```bash
docker-compose up -d prometheus grafana
```

Access:
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3000 (admin/admin)

### Metrics Endpoint

Backend exposes Prometheus metrics at `/metrics`:

```bash
curl http://localhost:5000/metrics
```

### Health Check

```bash
curl http://localhost:5000/health
```

## SSL/TLS Configuration

### Production HTTPS

1. Obtain SSL certificates (Let's Encrypt, AWS ACM, etc.)

2. Set environment variables:
   ```bash
   HTTPS_ENABLED=true
   SSL_KEY_PATH=/path/to/private.key
   SSL_CERT_PATH=/path/to/certificate.crt
   ```

3. Or use a reverse proxy (nginx, Traefik) with SSL termination

### Nginx Reverse Proxy Example

```nginx
server {
    listen 443 ssl http2;
    server_name api.uam.example;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Scaling

### Horizontal Scaling

- **Backend**: Stateless, can scale horizontally
- **Worker**: Can run multiple instances for parallel job processing
- **Redis**: Use Redis Cluster for high availability
- **PostgreSQL**: Use read replicas for read-heavy workloads

### Auto-scaling

Configure auto-scaling based on:
- CPU utilization
- Request rate
- Queue length (for workers)

## Backup & Recovery

### Database Backups

```bash
# PostgreSQL backup
pg_dump -U admin unified_auth > backup.sql

# Restore
psql -U admin unified_auth < backup.sql
```

### Automated Backups

Set up automated backups using:
- AWS RDS automated backups
- DigitalOcean managed database backups
- pgBackRest for self-hosted PostgreSQL

## Security Checklist

- [ ] All secrets stored in secrets manager (not in code)
- [ ] HTTPS enabled in production
- [ ] Database encryption at rest enabled
- [ ] Redis encryption in transit enabled
- [ ] Firewall rules restrict access to necessary ports only
- [ ] Regular security updates applied
- [ ] Rate limiting configured appropriately
- [ ] CORS origins restricted to known domains
- [ ] Monitoring and alerting configured
- [ ] Regular backups scheduled and tested

## Troubleshooting

### Container won't start

Check logs:
```bash
docker-compose logs backend
docker-compose logs worker
```

### Database connection errors

1. Verify `DATABASE_URL` is correct
2. Check network connectivity
3. Verify database is running and accessible

### Redis connection errors

1. Verify `REDIS_URL` is correct
2. Check Redis is running
3. Verify network connectivity

### Worker jobs not processing

1. Check Redis is accessible
2. Verify worker logs for errors
3. Check queue status in Redis

## Support

For issues and questions, see:
- API Documentation: `/openapi.yaml`
- Architecture: `docs/ARCHITECTURE.md`
- Security: `SECURITY_CONFIGURATION.md`



