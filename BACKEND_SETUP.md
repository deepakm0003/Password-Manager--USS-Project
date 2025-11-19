# Backend Setup Guide

## Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- npm or yarn

## Backend Setup

1. **Navigate to backend directory:**
```bash
cd backend
```

2. **Install dependencies:**
```bash
npm install
```

3. **Create `.env` file:**
```bash
cp .env.example .env
```

4. **Update `.env` with your configuration:**
```env
PORT=5000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://admin:securepass@localhost:5432/unified_auth?schema=public

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-min-32-chars
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# AES Encryption
AES_SECRET_KEY=your-32-byte-aes-secret-key-change-this

# Redis
REDIS_URL=redis://localhost:6379

# Email Relay
EMAIL_RELAY_DOMAIN=relay.unifiedauth.app

# CORS (add your Expo dev server URL)
CORS_ORIGIN=http://localhost:19006,exp://localhost:19000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

5. **Start PostgreSQL and Redis:**
```bash
# Using Docker Compose (recommended)
docker-compose up -d

# Or start manually:
# PostgreSQL: postgresql service
# Redis: redis-server
```

6. **Run Prisma migrations:**
```bash
npm run prisma:generate
npm run prisma:migrate
```

7. **Start the backend server:**
```bash
npm start
# or for development with auto-reload
npm run dev
```

## Frontend Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Update API URL in `services/api.ts`:**
```typescript
const API_BASE_URL = __DEV__
  ? 'http://localhost:5000/api' // Local development
  : 'https://your-production-api.com/api'; // Production
```

**Important:** For Android emulator, use `http://10.0.2.2:5000/api` instead of `localhost`.
For iOS simulator, `localhost` works fine.

3. **Start Expo:**
```bash
npm start
```

## Docker Setup (Alternative)

1. **Build and start all services:**
```bash
cd backend
docker-compose up -d
```

2. **Run migrations:**
```bash
docker-compose exec backend npx prisma migrate deploy
```

3. **View logs:**
```bash
docker-compose logs -f backend
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/biometric/verify` - Verify biometric
- `POST /api/auth/refresh` - Refresh JWT token
- `POST /api/auth/logout` - Logout

### Vault
- `GET /api/vault` - Get all vault items
- `POST /api/vault` - Add vault item
- `PUT /api/vault/:id` - Update vault item
- `DELETE /api/vault/:id` - Delete vault item
- `POST /api/vault/strength` - Check password strength

### MFA
- `POST /api/mfa/request` - Create MFA request
- `GET /api/mfa/pending` - Get pending requests
- `POST /api/mfa/approve/:id` - Approve request
- `POST /api/mfa/deny/:id` - Deny request
- `GET /api/mfa/history` - Get history

### Email Relay
- `GET /api/relay` - Get all aliases
- `POST /api/relay/create` - Create alias
- `POST /api/relay/deactivate/:id` - Deactivate alias
- `DELETE /api/relay/:id` - Delete alias

### User
- `GET /api/user/profile` - Get profile
- `PUT /api/user/profile` - Update profile
- `POST /api/user/security/biometric` - Enable/disable biometric
- `POST /api/user/security/password` - Change password
- `DELETE /api/user/delete` - Delete account

## Troubleshooting

### Connection Issues
- **Android Emulator:** Use `10.0.2.2` instead of `localhost`
- **iOS Simulator:** Use `localhost` or `127.0.0.1`
- **Physical Device:** Use your computer's IP address (e.g., `192.168.1.100:5000`)

### Database Issues
- Ensure PostgreSQL is running
- Check `DATABASE_URL` in `.env`
- Run migrations: `npm run prisma:migrate`

### Redis Issues
- Ensure Redis is running
- Check `REDIS_URL` in `.env`
- Backend will continue without Redis (graceful degradation)

### CORS Issues
- Add your Expo dev server URL to `CORS_ORIGIN` in `.env`
- Check browser console for CORS errors

## Production Deployment

1. **Update `.env` with production values:**
   - Strong `JWT_SECRET`
   - Production `DATABASE_URL`
   - Production `REDIS_URL`
   - Valid `CORS_ORIGIN`

2. **Build Docker images:**
```bash
docker-compose build
```

3. **Deploy:**
```bash
docker-compose up -d
```

4. **Run migrations:**
```bash
docker-compose exec backend npx prisma migrate deploy
```

## Security Notes

- Never commit `.env` file
- Use strong JWT secrets in production
- Enable HTTPS in production
- Use environment variables for secrets
- Regularly update dependencies
- Monitor audit logs

