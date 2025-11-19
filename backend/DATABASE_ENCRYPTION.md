# Database Encryption Configuration

## PostgreSQL Encryption at Rest

PostgreSQL provides Transparent Data Encryption (TDE) support. To enable encryption at rest:

### Option 1: Filesystem-Level Encryption

Configure your operating system to encrypt the PostgreSQL data directory:

**Linux (using LUKS):**
```bash
# Create encrypted volume
sudo cryptsetup luksFormat /dev/sdb1
sudo cryptsetup luksOpen /dev/sdb1 pgdata
sudo mkfs.ext4 /dev/mapper/pgdata

# Mount and initialize PostgreSQL
sudo mount /dev/mapper/pgdata /var/lib/postgresql/data
```

**Windows (using BitLocker):**
1. Enable BitLocker on the drive containing PostgreSQL data
2. Or use EFS (Encrypting File System) on the data folder

### Option 2: PostgreSQL Native Encryption

Use PostgreSQL extensions like `pgcrypto` for column-level encryption:

```sql
-- Enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Encrypt sensitive columns
UPDATE password_entries 
SET password = pgp_sym_encrypt(password, 'encryption_key');
```

### Option 3: Application-Level Encryption (Current Implementation)

- Passwords are encrypted client-side using AES-256 before sending to backend
- Backend stores encrypted passwords in database
- Only the client with the master password can decrypt
- This provides end-to-end encryption (zero-knowledge architecture)

## Configuration

Add to `.env` file (optional - only if using server-side encryption):

```env
# Database encryption key (32 bytes hex encoded)
DATABASE_ENCRYPTION_KEY=your-32-byte-hex-encoded-key-here

# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Current Security Model

1. **Client-Side Encryption**: All passwords encrypted before sending to backend
2. **Secure Transport**: Use HTTPS in production (configure SSL certificates)
3. **JWT Tokens**: Stored securely in device SecureStore
4. **Database**: Stores encrypted passwords (cannot be read without master password)

## Production Recommendations

1. Enable SSL/TLS for PostgreSQL connections
2. Configure firewall rules to restrict database access
3. Use connection pooling with authentication
4. Regular backups (encrypted)
5. Enable PostgreSQL audit logging
6. Use strong encryption keys (32+ bytes)

