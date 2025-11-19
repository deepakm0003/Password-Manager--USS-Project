-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "accountPasswordHash" TEXT NOT NULL,
    "masterPasswordHash" TEXT,
    "biometricEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_entries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "website" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "notes" TEXT,
    "category" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "iconUrl" TEXT,
    "isBreached" BOOLEAN NOT NULL DEFAULT false,
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "lastUsed" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "password_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_shares" (
    "id" TEXT NOT NULL,
    "passwordId" TEXT NOT NULL,
    "sharedByUserId" TEXT NOT NULL,
    "sharedWithUserId" TEXT NOT NULL,
    "encryptedPassword" TEXT NOT NULL,
    "permission" TEXT NOT NULL DEFAULT 'read',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "password_shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mfa_approvals" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "deviceInfo" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "aliasUsed" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "mfa_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_aliases" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "autoExpire" BOOLEAN NOT NULL DEFAULT false,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3),
    "replyMasking" BOOLEAN NOT NULL DEFAULT false,
    "replyMaskingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "emailsReceived" INTEGER NOT NULL DEFAULT 0,
    "loginsViaAlias" INTEGER NOT NULL DEFAULT 0,
    "trackerDetected" BOOLEAN NOT NULL DEFAULT false,
    "trackersBlocked" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_aliases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "refreshToken" TEXT,
    "deviceId" TEXT,
    "deviceName" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "refreshExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "details" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "location" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_themes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "themeName" TEXT NOT NULL DEFAULT 'default',
    "primary" TEXT NOT NULL DEFAULT '#6366f1',
    "secondary" TEXT,
    "background" TEXT NOT NULL DEFAULT '#ffffff',
    "surface" TEXT NOT NULL DEFAULT '#ffffff',
    "text" TEXT NOT NULL DEFAULT '#111827',
    "textSecondary" TEXT NOT NULL DEFAULT '#6b7280',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_themes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vault_metadata" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "encrypted" BOOLEAN NOT NULL DEFAULT false,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "algorithm" TEXT NOT NULL DEFAULT 'AES-256',
    "salt" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vault_metadata_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_username_idx" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "password_entries_userId_idx" ON "password_entries"("userId");

-- CreateIndex
CREATE INDEX "password_entries_website_idx" ON "password_entries"("website");

-- CreateIndex
CREATE INDEX "password_entries_category_idx" ON "password_entries"("category");

-- CreateIndex
CREATE INDEX "password_entries_isShared_idx" ON "password_entries"("isShared");

-- CreateIndex
CREATE INDEX "password_entries_isBreached_idx" ON "password_entries"("isBreached");

-- CreateIndex
CREATE INDEX "password_shares_passwordId_idx" ON "password_shares"("passwordId");

-- CreateIndex
CREATE INDEX "password_shares_sharedByUserId_idx" ON "password_shares"("sharedByUserId");

-- CreateIndex
CREATE INDEX "password_shares_sharedWithUserId_idx" ON "password_shares"("sharedWithUserId");

-- CreateIndex
CREATE INDEX "password_shares_expiresAt_idx" ON "password_shares"("expiresAt");

-- CreateIndex
CREATE INDEX "mfa_approvals_userId_idx" ON "mfa_approvals"("userId");

-- CreateIndex
CREATE INDEX "mfa_approvals_status_idx" ON "mfa_approvals"("status");

-- CreateIndex
CREATE INDEX "mfa_approvals_timestamp_idx" ON "mfa_approvals"("timestamp");

-- CreateIndex
CREATE INDEX "mfa_approvals_service_idx" ON "mfa_approvals"("service");

-- CreateIndex
CREATE UNIQUE INDEX "email_aliases_alias_key" ON "email_aliases"("alias");

-- CreateIndex
CREATE INDEX "email_aliases_userId_idx" ON "email_aliases"("userId");

-- CreateIndex
CREATE INDEX "email_aliases_alias_idx" ON "email_aliases"("alias");

-- CreateIndex
CREATE INDEX "email_aliases_status_idx" ON "email_aliases"("status");

-- CreateIndex
CREATE INDEX "email_aliases_expiresAt_idx" ON "email_aliases"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_refreshToken_key" ON "sessions"("refreshToken");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "sessions_token_idx" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_refreshToken_idx" ON "sessions"("refreshToken");

-- CreateIndex
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");

-- CreateIndex
CREATE INDEX "sessions_revoked_idx" ON "sessions"("revoked");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_event_idx" ON "audit_logs"("event");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "user_themes_userId_key" ON "user_themes"("userId");

-- CreateIndex
CREATE INDEX "user_themes_userId_idx" ON "user_themes"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "vault_metadata_userId_key" ON "vault_metadata"("userId");

-- CreateIndex
CREATE INDEX "vault_metadata_userId_idx" ON "vault_metadata"("userId");

-- AddForeignKey
ALTER TABLE "password_entries" ADD CONSTRAINT "password_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_shares" ADD CONSTRAINT "password_shares_passwordId_fkey" FOREIGN KEY ("passwordId") REFERENCES "password_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_shares" ADD CONSTRAINT "password_shares_sharedByUserId_fkey" FOREIGN KEY ("sharedByUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_shares" ADD CONSTRAINT "password_shares_sharedWithUserId_fkey" FOREIGN KEY ("sharedWithUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mfa_approvals" ADD CONSTRAINT "mfa_approvals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_aliases" ADD CONSTRAINT "email_aliases_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_themes" ADD CONSTRAINT "user_themes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
