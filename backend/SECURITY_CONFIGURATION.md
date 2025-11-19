# Security Configuration Guide

## Database Encryption

### Setting Encryption Key

1. Generate a strong encryption key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

2. Add to `backend/.env`:
```
ENCRYPTION_KEY=your-generated-32-byte-hex-key-here
```

### PostgreSQL SSL Connection

Update `DATABASE_URL` in `backend/.env` to use SSL:
```
DATABASE_URL="postgresql://postgres:password@localhost:5432/unified_auth_manager?schema=public&sslmode=require"
```

## HTTPS/TLS Configuration

### For Production

1. Obtain SSL certificate (Let's Encrypt recommended)
2. Update backend to use HTTPS:
   - Create `server.ts` with HTTPS configuration
   - Update API base URL to `https://your-domain.com/api`

### Development

For local development, you can use:
- `mkcert` for local SSL certificates
- Or use HTTP (development only)

## JWT Token Security

- Tokens are stored in SecureStore (hardware-backed on mobile)
- Tokens expire after 24 hours (configurable)
- Refresh tokens expire after 7 days
- Automatic token refresh on 401 errors

## Security Headers

The backend includes:
- HSTS (HTTP Strict Transport Security)
- X-Content-Type-Options
- X-Frame-Options
- X-XSS-Protection
- Content-Security-Policy
- Referrer-Policy

## Rate Limiting

- Authentication endpoints: 5 requests per 15 minutes
- Password endpoints: 100 requests per hour
- General API: 100 requests per 15 minutes

## Input Validation

- Email validation
- Password strength validation
- SQL injection protection
- XSS protection via sanitization
- Request size limits (1MB)

## Database Security

- All sensitive fields encrypted at rest
- Passwords encrypted with AES-256-GCM
- Usernames encrypted
- Notes encrypted
- Unique salts per encryption

