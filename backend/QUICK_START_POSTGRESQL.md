# Quick Start Guide - PostgreSQL Database Connection

## 🚀 Quick Setup (5 Minutes)

### Step 1: Create Database in PostgreSQL

```bash
# Login to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE unified_auth_manager;

# Create user (optional but recommended)
CREATE USER unified_auth_user WITH PASSWORD 'your_password_here';
GRANT ALL PRIVILEGES ON DATABASE unified_auth_manager TO unified_auth_user;

# For PostgreSQL 15+, grant schema privileges
\c unified_auth_manager
GRANT ALL ON SCHEMA public TO unified_auth_user;

# Exit
\q
```

### Step 2: Configure Connection String

Create `.env` file in `backend` folder:

**If you created a new user:**
```env
DATABASE_URL="postgresql://unified_auth_user:your_password_here@localhost:5432/unified_auth_manager?schema=public"
JWT_SECRET="your_secret_key_here"
PORT=3000
```

**If using postgres user:**
```env
DATABASE_URL="postgresql://postgres:your_postgres_password@localhost:5432/unified_auth_manager?schema=public"
JWT_SECRET="your_secret_key_here"
PORT=3000
```

### Step 3: Install & Setup

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev --name init
```

### Step 4: Test Connection

```bash
# Test connection
npm run test:db

# Or start server
npm run dev

# Or view database
npx prisma studio
```

## ✅ That's It!

Your database is now connected. The server should start successfully.

## 📝 Connection String Format

```
postgresql://[username]:[password]@[host]:[port]/[database_name]?schema=public
```

### Examples:

```env
# Local PostgreSQL
DATABASE_URL="postgresql://postgres:password123@localhost:5432/unified_auth_manager?schema=public"

# Remote PostgreSQL
DATABASE_URL="postgresql://user:pass@192.168.1.100:5432/unified_auth_manager?schema=public"

# With special characters in password (URL encoded)
DATABASE_URL="postgresql://user:p%40ssw0rd%23@localhost:5432/unified_auth_manager?schema=public"

# With SSL
DATABASE_URL="postgresql://user:pass@localhost:5432/unified_auth_manager?schema=public&sslmode=require"
```

## 🔧 Common Issues

### "Access Denied" / "password authentication failed"
- Check username and password
- Verify user has permissions: `GRANT ALL PRIVILEGES ON DATABASE unified_auth_manager TO 'user';`
- For PostgreSQL 15+: `GRANT ALL ON SCHEMA public TO 'user';`

### "Unknown Database"
- Create database: `CREATE DATABASE unified_auth_manager;`

### "Can't Connect"
- Check if PostgreSQL is running
- Verify port (default: 5432)
- Check firewall settings

### "permission denied for schema public" (PostgreSQL 15+)
```sql
\c unified_auth_manager
GRANT ALL ON SCHEMA public TO unified_auth_user;
```

## 📚 Need More Help?

See `POSTGRESQL_SETUP.md` for detailed instructions.

## 🎯 Next Steps

1. ✅ Database created
2. ✅ `.env` file configured
3. ✅ Migrations run
4. ✅ Connection tested
5. ✅ Server started

Your PostgreSQL database is ready!

