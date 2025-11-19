# Database Summary - Unified Authentication Manager

## 📊 Where All Data is Stored

### Current Storage Architecture

#### 1. Mobile App (React Native/Expo)
- **Local File Storage**: JSON files on device
  - Location: `FileSystem.documentDirectory/users/`
  - Files:
    - `users_registry.json` - All users
    - `users/{userId}/data.json` - User's encrypted vault
- **AsyncStorage**: Key-value store on device
  - Keys: `@current_user`, `@master_password`, `@biometric_enabled`, etc.

#### 2. Backend (Node.js/Express)
- **PostgreSQL Database**: Relational database
  - Location: Local PostgreSQL instance (configurable)
  - ORM: Prisma
  - Schema: `backend/prisma/schema.prisma`

## 🗄️ Database Schema Overview

### Important Tables

1. **`users`** - User accounts
   - Stores: username, email, password hashes, biometric status
   - Key fields: `id`, `username`, `email`, `accountPasswordHash`, `masterPasswordHash`

2. **`password_entries`** - Encrypted passwords
   - Stores: website, username, encrypted password, notes, tags, category
   - Key fields: `id`, `userId`, `website`, `username`, `password`, `isBreached`, `isShared`

3. **`password_shares`** - Password sharing
   - Stores: shared passwords between users
   - Key fields: `id`, `passwordId`, `sharedByUserId`, `sharedWithUserId`, `permission`

4. **`mfa_approvals`** - MFA requests
   - Stores: MFA approval requests and status
   - Key fields: `id`, `userId`, `service`, `location`, `status`, `timestamp`

5. **`email_aliases`** - Email aliases
   - Stores: Email aliases for privacy
   - Key fields: `id`, `userId`, `alias`, `status`, `trackersBlocked`, `loginsViaAlias`

6. **`sessions`** - User sessions
   - Stores: JWT tokens and session data
   - Key fields: `id`, `userId`, `token`, `refreshToken`, `expiresAt`, `revoked`

7. **`audit_logs`** - Security events
   - Stores: All security events and audit logs
   - Key fields: `id`, `userId`, `event`, `details`, `ipAddress`, `location`

8. **`user_themes`** - User themes
   - Stores: User theme preferences
   - Key fields: `id`, `userId`, `themeName`, `primary`, `background`, `text`

9. **`vault_metadata`** - Vault metadata
   - Stores: Vault encryption metadata
   - Key fields: `id`, `userId`, `encrypted`, `version`, `algorithm`

## 🚀 Quick Setup Guide

### Step 1: Install PostgreSQL

**Windows:**
- Download from: https://www.postgresql.org/download/windows/
- Install and set up PostgreSQL

**macOS:**
```bash
brew install postgresql
brew services start postgresql
```

**Linux:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### Step 2: Create Database

```bash
# Login to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE unified_auth_manager;

# Create user (optional)
CREATE USER unified_auth_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE unified_auth_manager TO unified_auth_user;

# Exit
\q
```

### Step 3: Configure Environment

Create `.env` file in `backend` directory:

```env
DATABASE_URL="postgresql://unified_auth_user:your_secure_password@localhost:5432/unified_auth_manager?schema=public"
JWT_SECRET="your_jwt_secret_key_here"
JWT_REFRESH_SECRET="your_jwt_refresh_secret_key_here"
PORT=3000
NODE_ENV=development
```

### Step 4: Run Setup Script

**Windows (PowerShell):**
```powershell
cd backend
.\setup-database.ps1
```

**Unix/Linux/macOS:**
```bash
cd backend
chmod +x setup-database.sh
./setup-database.sh
```

### Step 5: Manual Setup (Alternative)

```bash
cd backend

# Install dependencies
npm install

# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# Seed database (optional)
npm run prisma:seed
```

## 📁 Files Created

1. **`backend/prisma/schema.prisma`** - Complete Prisma schema
2. **`backend/DATABASE_SETUP.md`** - Detailed setup guide
3. **`backend/setup-database.sh`** - Unix setup script
4. **`backend/setup-database.ps1`** - Windows setup script
5. **`backend/prisma/seed.ts`** - Database seed file
6. **`DATA_STORAGE_OVERVIEW.md`** - Data storage overview
7. **`DATABASE_SUMMARY.md`** - This file

## 🔍 Database Models Details

### User Model
- **Primary Key**: `id` (UUID)
- **Unique Fields**: `username`, `email`
- **Relations**: passwords, mfaApprovals, emailAliases, passwordShares, sessions, auditLogs, theme

### PasswordEntry Model
- **Primary Key**: `id` (UUID)
- **Foreign Key**: `userId` → User.id
- **Indexes**: userId, website, category, isShared, isBreached
- **Relations**: user, shares

### PasswordShare Model
- **Primary Key**: `id` (UUID)
- **Foreign Keys**: `passwordId`, `sharedByUserId`, `sharedWithUserId`
- **Indexes**: passwordId, sharedByUserId, sharedWithUserId, expiresAt
- **Relations**: password, sharedBy, sharedWith

### MFAApproval Model
- **Primary Key**: `id` (UUID)
- **Foreign Key**: `userId` → User.id
- **Indexes**: userId, status, timestamp, service
- **Relations**: user

### EmailAlias Model
- **Primary Key**: `id` (UUID)
- **Unique Field**: `alias`
- **Foreign Key**: `userId` → User.id
- **Indexes**: userId, alias, status, expiresAt
- **Relations**: user

### Session Model
- **Primary Key**: `id` (UUID)
- **Unique Fields**: `token`, `refreshToken`
- **Foreign Key**: `userId` → User.id
- **Indexes**: userId, token, refreshToken, expiresAt, revoked
- **Relations**: user

### AuditLog Model
- **Primary Key**: `id` (UUID)
- **Foreign Key**: `userId` → User.id
- **Indexes**: userId, event, createdAt
- **Relations**: user

### UserTheme Model
- **Primary Key**: `id` (UUID)
- **Unique Field**: `userId`
- **Foreign Key**: `userId` → User.id
- **Indexes**: userId
- **Relations**: user (one-to-one)

### VaultMetadata Model
- **Primary Key**: `id` (UUID)
- **Unique Field**: `userId`
- **Indexes**: userId
- **No relations**

## 🔐 Security Considerations

1. **Password Encryption**: All passwords are encrypted with master password before storage
2. **Password Hashing**: Account and master passwords are hashed with bcrypt
3. **Zero-Knowledge**: Master password is never stored in plain text
4. **Session Management**: JWT tokens with expiration and refresh tokens
5. **Audit Logging**: All security events are logged

## 📊 Data Flow

### User Registration
1. User creates account on mobile app
2. Account password is hashed (bcrypt)
3. User data is stored in local file storage
4. User is saved to PostgreSQL database (via backend API)

### Password Storage
1. User enters password on mobile app
2. Password is encrypted with master password (AES-256)
3. Encrypted password is stored in local file storage
4. Encrypted password is synced to PostgreSQL database (via backend API)

### MFA Approval
1. MFA request is created on mobile app
2. Request is stored in local file storage
3. Request is synced to PostgreSQL database (via backend API)
4. User approves/denies request
5. Status is updated in database

## 🛠️ Useful Commands

### Prisma Commands
```bash
# Generate Prisma Client
npx prisma generate

# Create migration
npx prisma migrate dev --name migration_name

# Apply migrations
npx prisma migrate deploy

# Reset database (WARNING: Deletes all data)
npx prisma migrate reset

# View database in Prisma Studio
npx prisma studio

# Seed database
npm run prisma:seed

# Validate schema
npx prisma validate
```

### Database Commands
```bash
# Connect to database
psql -U unified_auth_user -d unified_auth_manager

# Backup database
pg_dump -U unified_auth_user -d unified_auth_manager -f backup.sql

# Restore database
psql -U unified_auth_user -d unified_auth_manager -f backup.sql
```

## 📝 Next Steps

1. ✅ Install PostgreSQL
2. ✅ Create database
3. ✅ Configure `.env` file
4. ✅ Run setup script or manual setup
5. ✅ Generate Prisma Client
6. ✅ Run migrations
7. ✅ Seed database (optional)
8. ✅ Start backend server: `npm run dev`
9. ✅ Open Prisma Studio: `npm run prisma:studio`
10. ✅ Connect mobile app to backend API

## 📚 Documentation

- **Setup Guide**: `backend/DATABASE_SETUP.md`
- **Data Storage Overview**: `DATA_STORAGE_OVERVIEW.md`
- **Prisma Schema**: `backend/prisma/schema.prisma`
- **Seed File**: `backend/prisma/seed.ts`

## 🎯 Important Notes

1. **Database URL**: Must be in format: `postgresql://user:password@host:port/database`
2. **Migrations**: Always create migrations for schema changes
3. **Backups**: Regularly backup your database
4. **Security**: Never commit `.env` file with real credentials
5. **Testing**: Use separate database for testing

## 🔗 Related Files

- `backend/prisma/schema.prisma` - Prisma schema
- `backend/prisma/seed.ts` - Seed file
- `backend/DATABASE_SETUP.md` - Setup guide
- `backend/setup-database.sh` - Unix setup script
- `backend/setup-database.ps1` - Windows setup script
- `DATA_STORAGE_OVERVIEW.md` - Data storage overview
- `types/index.ts` - TypeScript types (matches database schema)




