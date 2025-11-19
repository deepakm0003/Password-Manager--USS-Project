# HTTPS/TLS Setup Guide

## Development (HTTP)

Currently running on HTTP for development. This is fine for local testing.

## Production (HTTPS)

For production, you need to set up HTTPS with SSL certificates.

### Option 1: Using Express with HTTPS

1. **Generate SSL certificates** (or use Let's Encrypt):

```bash
# Self-signed certificate for testing
openssl req -x509 -newkey rsa:4096 -nodes -keyout key.pem -out cert.pem -days 365

# Or use Let's Encrypt for production
# Install certbot: sudo apt-get install certbot
# certbot certonly --standalone -d yourdomain.com
```

2. **Update backend/src/index.ts**:

```typescript
import https from 'https';
import fs from 'fs';

const options = {
  key: fs.readFileSync('path/to/key.pem'),
  cert: fs.readFileSync('path/to/cert.pem'),
};

https.createServer(options, app).listen(PORT, () => {
  console.log(`🚀 HTTPS Server running on port ${PORT}`);
});
```

3. **Update .env**:

```env
HTTPS_ENABLED=true
SSL_KEY_PATH=./certs/key.pem
SSL_CERT_PATH=./certs/cert.pem
```

### Option 2: Using Reverse Proxy (Nginx/Apache)

Use Nginx or Apache as a reverse proxy with SSL termination:

**Nginx example:**
```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Option 3: Using a PaaS (Heroku, Railway, Render)

These platforms handle HTTPS automatically:
- Heroku: Automatic HTTPS
- Railway: Automatic HTTPS
- Render: Automatic HTTPS

## Frontend Configuration

Update `services/api.ts`:

```typescript
// For production, use HTTPS
const API_BASE_URL = __DEV__
  ? 'http://localhost:5000/api'
  : 'https://your-api-domain.com/api';
```

## Security Headers

The backend already includes:
- HSTS (HTTP Strict Transport Security)
- CSP (Content Security Policy)
- X-Frame-Options
- X-Content-Type-Options
- X-XSS-Protection

These are automatically enforced when using HTTPS.

## Current Status

- **Development**: HTTP (localhost only)
- **Production**: Configure HTTPS using one of the options above

