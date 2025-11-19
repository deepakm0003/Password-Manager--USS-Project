# PostgreSQL Database Setup Guide

## Overview

This guide explains how to set up the PostgreSQL database for the Unified Authentication Manager backend using Prisma.

## Prerequisites

- PostgreSQL Server installed (version 12 or higher recommended)
- Node.js and npm installed
- Access to PostgreSQL command line (`psql`) or a PostgreSQL client (pgAdmin, DBeaver, etc.)

## Step 1: Install PostgreSQL

### Windows
1. Download PostgreSQL from: https://www.postgresql.org/download/windows/
2. Run the installer and follow the setup wizard
3. Remember the postgres user password you set during installation
4. Make sure PostgreSQL service is running (check Services in Windows)

### macOS
```bash
# Using Homebrew
brew install postgresql
brew services start postgresql

# Or download from: https://www.postgresql.org/download/macosx/
```

### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

## Step 2: Create Database

### Option A: Using psql Command Line

1. **Login to PostgreSQL:**
```bash
# On Windows, use the PostgreSQL command prompt or:
psql -U postgres

# On macOS/Linux:
sudo -u postgres psql

# Enter your PostgreSQL password when prompted
```

2. **Create Database:**
```sql
CREATE DATABASE unified_auth_manager;

-- Verify database created
\l
```

3. **Create User (Optional but Recommended):**
```sql
CREATE USER unified_auth_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE unified_auth_manager TO unified_auth_user;

-- For PostgreSQL 15+, also grant schema privileges
\c unified_auth_manager
GRANT ALL ON SCHEMA public TO unified_auth_user;
```

4. **Verify Database Created:**
```sql
\c unified_auth_manager
SELECT current_database();
```

5. **Exit PostgreSQL:**
```sql
\q
```

### Option B: Using pgAdmin or DBeaver

1. Open pgAdmin or DBeaver
2. Connect to your PostgreSQL server
3. Create a new database named `unified_auth_manager`
4. Create a new user `unified_auth_user` with password
5. Grant all privileges on `unified_auth_manager` database to the user

## Step 3: Configure Environment Variables

Create a `.env` file in the `backend` directory:

### Windows (PowerShell)
```powershell
cd backend
New-Item -ItemType File -Name .env
```

### macOS/Linux
```bash
cd backend
touch .env
```

### Add Database Connection String

Edit the `.env` file and add:

```env
# PostgreSQL Database Connection
# Format: postgresql://username:password@host:port/database?schema=public
DATABASE_URL="postgresql://unified_auth_user:your_secure_password@localhost:5432/unified_auth_manager?schema=public"

# If using postgres user (not recommended for production):
# DATABASE_URL="postgresql://postgres:your_postgres_password@localhost:5432/unified_auth_manager?schema=public"

# JWT Configuration
JWT_SECRET="your_jwt_secret_key_here_change_in_production"
JWT_REFRESH_SECRET="your_jwt_refresh_secret_key_here_change_in_production"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Redis Configuration (optional, for caching)
REDIS_URL="redis://localhost:6379"

# Email Configuration (for email relay)
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT=587
EMAIL_USER="your_email@gmail.com"
EMAIL_PASSWORD="your_email_password"
EMAIL_FROM="noreply@unifiedauth.app"

# Server Configuration
PORT=3000
NODE_ENV=development

# CORS Configuration
CORS_ORIGIN="http://localhost:19006"

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Security
BCRYPT_ROUNDS=10
```

## Step 4: Install Dependencies

```bash
cd backend
npm install
```

## Step 5: Generate Prisma Client

```bash
npx prisma generate
```

This will generate the Prisma Client based on your schema.

## Step 6: Run Database Migrations

```bash
# Create initial migration
npx prisma migrate dev --name init

# This will:
# 1. Create migration files
# 2. Apply migrations to your PostgreSQL database
# 3. Generate Prisma Client
```

## Step 7: Seed Database (Optional)

If you want to add test data:

```bash
npm run prisma:seed
```

## Step 8: Verify Connection

### Option A: Test Connection in Code

Run the test script:

```bash
npm run test:db
```

Or create a test file `test-db.js`:

```javascript
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testConnection() {
  try {
    await prisma.$connect();
    console.log('✅ Database connection successful!');
    const result = await prisma.$queryRaw`SELECT 1 as test, current_database() as database, current_user as user`;
    console.log('✅ Database query successful!', result);
  } catch (error) {
    console.error('❌ Database connection failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
```

### Option B: Use Prisma Studio

```bash
npx prisma studio
```

This will open a web interface at `http://localhost:5555` where you can view and manage your database.

## Step 9: Start Backend Server

```bash
npm run dev
```

The server should start and connect to your PostgreSQL database.

## Common Connection String Formats

### Local PostgreSQL
```env
DATABASE_URL="postgresql://username:password@localhost:5432/database_name?schema=public"
```

### Remote PostgreSQL
```env
DATABASE_URL="postgresql://username:password@your_server_ip:5432/database_name?schema=public"
```

### PostgreSQL with SSL
```env
DATABASE_URL="postgresql://username:password@localhost:5432/database_name?schema=public&sslmode=require"
```

### PostgreSQL Connection Pool
```env
DATABASE_URL="postgresql://username:password@localhost:5432/database_name?schema=public&connection_limit=10"
```

### With Special Characters in Password

If your password contains special characters, URL encode them:
- `@` becomes `%40`
- `#` becomes `%23`
- `$` becomes `%24`
- `%` becomes `%25`
- `&` becomes `%26`

Example:
```env
DATABASE_URL="postgresql://user:p%40ssw0rd%23@localhost:5432/database_name?schema=public"
```

## Troubleshooting

### Connection Refused
- **Problem:** `ECONNREFUSED` error
- **Solution:** 
  - Check if PostgreSQL service is running: `sudo systemctl status postgresql` (Linux) or check Services (Windows)
  - Verify PostgreSQL is listening on port 5432: `netstat -an | grep 5432` or `ss -tlnp | grep 5432`
  - Check if firewall is blocking the connection

### Access Denied
- **Problem:** `Access denied for user` or `password authentication failed`
- **Solution:**
  - Verify username and password in `.env` file
  - Check if user has correct permissions
  - Try connecting with postgres user first to verify database exists
  - Check `pg_hba.conf` file for authentication settings

### Unknown Database
- **Problem:** `database "unified_auth_manager" does not exist`
- **Solution:**
  - Create the database manually (see Step 2)
  - Or check if database name in connection string is correct

### Can't Connect to Server
- **Problem:** `Can't connect to PostgreSQL server`
- **Solution:**
  - Check if PostgreSQL is running
  - Verify host (localhost or IP address)
  - Check port (default is 5432)
  - For remote connections, ensure PostgreSQL allows remote connections (edit `postgresql.conf` and `pg_hba.conf`)

### Prisma Migration Errors
- **Problem:** Migration fails
- **Solution:**
  - Check if database exists
  - Verify user has CREATE, ALTER, and DROP privileges
  - Check PostgreSQL version (12+ recommended)
  - Try running: `npx prisma migrate reset` (WARNING: Deletes all data)
  - Check if schema exists: `CREATE SCHEMA IF NOT EXISTS public;`

### Schema Permission Errors
- **Problem:** `permission denied for schema public` (PostgreSQL 15+)
- **Solution:**
  ```sql
  \c unified_auth_manager
  GRANT ALL ON SCHEMA public TO unified_auth_user;
  GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO unified_auth_user;
  GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO unified_auth_user;
  ```

### Character Set Issues
- **Problem:** Special characters not saving correctly
- **Solution:**
  - PostgreSQL uses UTF-8 by default, should work fine
  - Ensure your client connects with UTF-8 encoding

## PostgreSQL-Specific Features

1. **Arrays:** PostgreSQL supports native array types (we use `String[]` for tags)
2. **UUIDs:** PostgreSQL has native UUID type (we use String UUIDs for compatibility)
3. **JSON:** PostgreSQL has native JSON and JSONB types
4. **Indexes:** PostgreSQL has advanced indexing capabilities
5. **Transactions:** PostgreSQL supports full ACID transactions
6. **Full-Text Search:** PostgreSQL has powerful full-text search capabilities

## Next Steps

1. ✅ Verify database connection
2. ✅ Run migrations
3. ✅ Test API endpoints
4. ✅ Connect mobile app to backend
5. ✅ Start developing features

## Useful Commands

### PostgreSQL Commands

```sql
-- List all databases
\l

-- Connect to database
\c unified_auth_manager

-- List all tables
\dt

-- Describe table
\d table_name

-- List all users
\du

-- Exit
\q
```

### Prisma Commands

```bash
# View database in Prisma Studio
npx prisma studio

# Create new migration
npx prisma migrate dev --name migration_name

# Apply migrations (production)
npx prisma migrate deploy

# Reset database (WARNING: Deletes all data)
npx prisma migrate reset

# View migration status
npx prisma migrate status

# Generate Prisma Client (after schema changes)
npx prisma generate

# Format Prisma schema
npx prisma format

# Validate Prisma schema
npx prisma validate

# Test database connection
npm run test:db
```

## Security Best Practices

1. **Never commit `.env` file** - Add it to `.gitignore`
2. **Use strong passwords** - For database users
3. **Create dedicated user** - Don't use postgres user in production
4. **Limit privileges** - Only grant necessary permissions
5. **Use SSL** - For remote connections in production
6. **Regular backups** - Backup your database regularly using `pg_dump`
7. **Keep PostgreSQL updated** - Install security updates
8. **Configure pg_hba.conf** - Restrict access appropriately

## Production Checklist

- [ ] PostgreSQL server installed and configured
- [ ] Database created
- [ ] Dedicated database user created
- [ ] Strong password set
- [ ] `.env` file configured with production values
- [ ] SSL configured (for remote connections)
- [ ] Migrations run successfully
- [ ] Database connection tested
- [ ] Backups configured (`pg_dump` scheduled)
- [ ] Monitoring set up
- [ ] Firewall rules configured
- [ ] Connection pooling configured

## Backup and Restore

### Backup Database
```bash
# Backup database
pg_dump -U unified_auth_user -d unified_auth_manager -f backup.sql

# Backup with compression
pg_dump -U unified_auth_user -d unified_auth_manager -F c -f backup.dump

# Backup only schema
pg_dump -U unified_auth_user -d unified_auth_manager --schema-only -f schema.sql
```

### Restore Database
```bash
# Restore from SQL file
psql -U unified_auth_user -d unified_auth_manager -f backup.sql

# Restore from compressed dump
pg_restore -U unified_auth_user -d unified_auth_manager backup.dump
```

