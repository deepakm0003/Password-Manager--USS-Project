# Unified Authentication Manager - Full Stack Setup

## 🎯 Overview

This is a production-ready full-stack authentication manager with:
- **Frontend:** Expo React Native app
- **Backend:** Node.js + Express API
- **Database:** PostgreSQL with Prisma ORM
- **Cache:** Redis for MFA queues
- **Encryption:** AES-256 client-side encryption (zero-knowledge)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- Expo CLI
- npm or yarn

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env with your configuration
# - DATABASE_URL
# - JWT_SECRET
# - REDIS_URL
# - CORS_ORIGIN

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Start backend server
npm start
# or for development with auto-reload
npm run dev
```

### 2. Frontend Setup

```bash
# Install dependencies
npm install

# Update API URL in services/api.ts
# - iOS Simulator: http://localhost:5000/api
# - Android Emulator: http://10.0.2.2:5000/api
# - Physical Device: http://YOUR_IP:5000/api

# Start Expo
npm start
```

### 3. Docker Setup (Alternative)

```bash
cd backend
docker-compose up -d
docker-compose exec backend npx prisma migrate deploy
```

## 📁 Project Structure

```
.
├── backend/                 # Backend API server
│   ├── src/
│   │   ├── routes/         # API routes
│   │   ├── middleware/     # Auth middleware
│   │   ├── utils/          # Utilities (crypto, JWT, Redis)
│   │   └── index.js        # Server entry point
│   ├── prisma/
│   │   └── schema.prisma   # Database schema
│   ├── docker-compose.yml  # Docker setup
│   └── package.json
├── screens/                # React Native screens
├── services/               # API services
│   ├── api.ts             # API client
│   └── vaultService.ts    # Vault service with encryption
├── components/            # React components
├── contexts/              # React contexts
└── package.json
```

## 🔑 Key Features

### Authentication
- User registration and login
- JWT token-based authentication
- Biometric authentication (Face ID / Fingerprint)
- Secure password storage with bcrypt

### Password Vault
- Zero-knowledge encryption (client-side)
- AES-256 encryption for passwords
- CRUD operations for passwords
- Password strength analysis

### MFA System
- Real-time MFA requests via Redis
- Approve/deny login attempts
- MFA history tracking
- Mock external login requests

### Email Relay
- Create temporary email aliases
- Forward emails to real address
- Manage aliases (activate/deactivate)
- Privacy protection

## 🔒 Security Features

- **Zero-Knowledge Encryption:** Passwords encrypted client-side
- **JWT Authentication:** Secure token-based auth
- **Rate Limiting:** Protect against brute force
- **Audit Logging:** Track all user actions
- **HTTPS Ready:** Production-ready security
- **Secure Storage:** Tokens in SecureStore

## 📱 API Endpoints

### Authentication
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login user
- `POST /api/auth/biometric/verify` - Verify biometric
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Logout

### Vault
- `GET /api/vault` - Get all passwords
- `POST /api/vault` - Add password
- `PUT /api/vault/:id` - Update password
- `DELETE /api/vault/:id` - Delete password
- `POST /api/vault/strength` - Check strength

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
- `POST /api/user/security/biometric` - Enable biometric
- `POST /api/user/security/password` - Change password
- `DELETE /api/user/delete` - Delete account

## 🐛 Troubleshooting

### Backend Issues

**Database Connection Error:**
```bash
# Check PostgreSQL is running
# Verify DATABASE_URL in .env
# Run migrations: npm run prisma:migrate
```

**Redis Connection Error:**
```bash
# Backend will continue without Redis (graceful degradation)
# Check REDIS_URL in .env
# Start Redis: redis-server
```

### Frontend Issues

**API Connection Error:**
```bash
# Check API_BASE_URL in services/api.ts
# Verify backend is running on port 5000
# Check CORS settings in backend .env
# For Android emulator, use 10.0.2.2 instead of localhost
```

**Authentication Error:**
```bash
# Check JWT_SECRET in backend .env
# Verify tokens are stored in SecureStore
# Check token expiration settings
```

## 🚀 Production Deployment

1. **Update Environment Variables:**
   - Strong JWT_SECRET
   - Production DATABASE_URL
   - Production REDIS_URL
   - Valid CORS_ORIGIN
   - HTTPS enabled

2. **Build Docker Images:**
```bash
docker-compose build
```

3. **Deploy:**
```bash
docker-compose up -d
```

4. **Run Migrations:**
```bash
docker-compose exec backend npx prisma migrate deploy
```

## 📚 Documentation

- `BACKEND_SETUP.md` - Detailed backend setup
- `INTEGRATION_SUMMARY.md` - Integration details
- `backend/README.md` - Backend API documentation

## 🔐 Security Notes

- Never commit `.env` files
- Use strong JWT secrets in production
- Enable HTTPS in production
- Use environment variables for secrets
- Regularly update dependencies
- Monitor audit logs

## 📝 License

ISC

## 🙏 Support

For issues or questions, please check:
- Backend logs: `docker-compose logs -f backend`
- Frontend logs: Expo dev tools
- Database: Prisma Studio (`npm run prisma:studio`)

