# Database Setup Guide

## Overview

This guide explains how to set up the PostgreSQL database for the Unified Authentication Manager backend using Prisma.

## Data Storage Locations

### Current Storage (Mobile App)
- **Local File Storage**: Data is stored in JSON files on the device
  - Location: `FileSystem.documentDirectory/users/`
  - Users Registry: `users_registry.json`
  - User Data: `users/{userId}/data.json`
  - Storage: AsyncStorage for current user session

### Backend Database (PostgreSQL)
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Location**: Local PostgreSQL database (can be configured)

## Database Schema

The Prisma schema includes the following models:

1. **User** - User accounts (login credentials and master password)
2. **PasswordEntry** - Encrypted passwords in user's vault
3. **PasswordShare** - Password sharing information
4. **MFAApproval** - Multi-factor authentication requests
5. **EmailAlias** - Email aliases for privacy protection
6. **Session** - User sessions and JWT tokens
7. **AuditLog** - Security events and audit logs
8. **UserTheme** - User theme preferences
9. **VaultMetadata** - Vault encryption metadata

## Setup Instructions

### 1. Install PostgreSQL

#### Windows
```bash
# Download and install PostgreSQL from:
# https://www.postgresql.org/download/windows/
```

#### macOS
```bash
# Using Homebrew
brew install postgresql
brew services start postgresql
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 2. Create Database

```bash
# Login to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE unified_auth_manager;

# Create user (optional)
CREATE USER unified_auth_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE unified_auth_manager TO unified_auth_user;

# Exit PostgreSQL
\q
```

### 3. Configure Environment Variables

Create a `.env` file in the `backend` directory:

```env
# Database
DATABASE_URL="postgresql://unified_auth_user:your_secure_password@localhost:5432/unified_auth_manager?schema=public"

# JWT Secret
JWT_SECRET="your_jwt_secret_key_here"
JWT_REFRESH_SECRET="your_jwt_refresh_secret_key_here"

# Redis (optional, for caching)
REDIS_URL="redis://localhost:6379"

# Email (for email relay)
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT=587
EMAIL_USER="your_email@gmail.com"
EMAIL_PASSWORD="your_email_password"

# App
PORT=3000
NODE_ENV=development
```

### 4. Install Dependencies

```bash
cd backend
npm install
```

### 5. Generate Prisma Client

```bash
npm run prisma:generate
```

### 6. Run Database Migrations

```bash
# Create initial migration
npm run prisma:migrate

# Or use migrate dev (creates migration and applies it)
npx prisma migrate dev --name init
```

### 7. Seed Database (Optional)

```bash
npm run prisma:seed
```

### 8. Verify Database Setup

```bash
# Open Prisma Studio to view database
npm run prisma:studio
```

This will open a browser at `http://localhost:5555` where you can view and manage your database.

## Database Models Details

### User Model
- Stores user account information
- Fields: `id`, `username`, `email`, `accountPasswordHash`, `masterPasswordHash`, `biometricEnabled`
- Relations: passwords, mfaApprovals, emailAliases, sessions, auditLogs

### PasswordEntry Model
- Stores encrypted passwords
- Fields: `id`, `userId`, `website`, `username`, `password`, `notes`, `category`, `tags`, `iconUrl`, `isBreached`, `isShared`, `lastUsed`
- Relations: user, shares

### PasswordShare Model
- Stores password sharing information
- Fields: `id`, `passwordId`, `sharedByUserId`, `sharedWithUserId`, `encryptedPassword`, `permission`, `expiresAt`
- Relations: password, sharedBy, sharedWith

### MFAApproval Model
- Stores MFA requests and approvals
- Fields: `id`, `userId`, `service`, `location`, `deviceInfo`, `ipAddress`, `userAgent`, `aliasUsed`, `status`, `timestamp`, `resolvedAt`
- Relations: user

### EmailAlias Model
- Stores email aliases
- Fields: `id`, `userId`, `alias`, `status`, `autoExpire`, `usedCount`, `lastUsedAt`, `replyMasking`, `emailsReceived`, `loginsViaAlias`, `trackerDetected`, `trackersBlocked`, `expiresAt`
- Relations: user

### Session Model
- Stores user sessions
- Fields: `id`, `userId`, `token`, `refreshToken`, `deviceId`, `deviceName`, `ipAddress`, `userAgent`, `expiresAt`, `refreshExpiresAt`, `revoked`
- Relations: user

### AuditLog Model
- Stores security events
- Fields: `id`, `userId`, `event`, `details`, `ipAddress`, `userAgent`, `location`, `metadata`, `createdAt`
- Relations: user

### UserTheme Model
- Stores user theme preferences
- Fields: `id`, `userId`, `themeName`, `primary`, `secondary`, `background`, `surface`, `text`, `textSecondary`
- Relations: user

### VaultMetadata Model
- Stores vault encryption metadata
- Fields: `id`, `userId`, `encrypted`, `version`, `algorithm`, `salt`
- No relations

## Important Notes

1. **Password Encryption**: Passwords are encrypted with the user's master password before being stored in the database.

2. **Master Password**: The master password hash is stored in the User model, but the actual master password is never stored (zero-knowledge architecture).

3. **Data Privacy**: All sensitive data (passwords, etc.) is encrypted client-side before being sent to the backend.

4. **Indexes**: The schema includes indexes on frequently queried fields for optimal performance.

5. **Cascading Deletes**: When a user is deleted, all related data (passwords, MFA approvals, etc.) is automatically deleted.

## Migration Commands

```bash
# Create a new migration
npx prisma migrate dev --name migration_name

# Apply migrations to production
npx prisma migrate deploy

# Reset database (WARNING: Deletes all data)
npx prisma migrate reset

# View migration status
npx prisma migrate status
```

## Backup and Restore

### Backup Database
```bash
# Using pg_dump
pg_dump -U unified_auth_user -d unified_auth_manager -f backup.sql

# Or using Prisma
npx prisma db pull
```

### Restore Database
```bash
# Using psql
psql -U unified_auth_user -d unified_auth_manager -f backup.sql
```

## Troubleshooting

### Connection Issues
- Check if PostgreSQL is running: `pg_isready`
- Verify database credentials in `.env`
- Check firewall settings

### Migration Issues
- Reset database: `npx prisma migrate reset`
- Check Prisma schema for errors: `npx prisma validate`
- View migration history: `npx prisma migrate status`

### Performance Issues
- Check database indexes
- Analyze query performance
- Consider adding more indexes if needed

## Next Steps

1. Start the backend server: `npm run dev`
2. Test API endpoints
3. Connect mobile app to backend
4. Migrate data from local storage to database (if needed)




