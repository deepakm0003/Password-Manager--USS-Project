import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clean up existing data
  console.log('🧹 Cleaning up existing data...');
  await prisma.auditLog.deleteMany();
  await prisma.session.deleteMany();
  await prisma.passwordShare.deleteMany();
  await prisma.passwordEntry.deleteMany();
  await prisma.mfaApproval.deleteMany();
  await prisma.emailAlias.deleteMany();
  await prisma.userTheme.deleteMany();
  await prisma.vaultMetadata.deleteMany();
  await prisma.user.deleteMany();

  // Create test users
  console.log('👤 Creating test users...');
  const accountPasswordHash = await bcrypt.hash('Test123!@#', 10);
  const masterPasswordHash = await bcrypt.hash('Master123!@#', 10);

  const user1 = await prisma.user.create({
    data: {
      username: 'testuser',
      email: 'testuser@example.com',
      accountPasswordHash,
      masterPasswordHash,
      biometricEnabled: false,
    },
  });

  const user2 = await prisma.user.create({
    data: {
      username: 'demo',
      email: 'demo@example.com',
      accountPasswordHash,
      masterPasswordHash,
      biometricEnabled: true,
    },
  });

  console.log('✅ Created users:', user1.username, user2.username);

  // Create password entries
  console.log('🔐 Creating password entries...');
  const password1 = await prisma.passwordEntry.create({
    data: {
      userId: user1.id,
      website: 'example.com',
      username: 'user@example.com',
      password: 'encrypted_password_1', // In production, this would be encrypted
      notes: 'Test password entry',
      category: 'Social Media',
      tags: ['important', 'personal'],
      isBreached: false,
      isShared: false,
    },
  });

  const password2 = await prisma.passwordEntry.create({
    data: {
      userId: user1.id,
      website: 'github.com',
      username: 'github_user',
      password: 'encrypted_password_2',
      category: 'Development',
      tags: ['work'],
      isBreached: false,
      isShared: false,
    },
  });

  console.log('✅ Created password entries');

  // Create MFA approvals
  console.log('🔒 Creating MFA approvals...');
  await prisma.mfaApproval.create({
    data: {
      userId: user1.id,
      service: 'GitHub',
      location: 'New York, USA',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      status: 'approved',
      timestamp: new Date(),
      resolvedAt: new Date(),
    },
  });

  await prisma.mfaApproval.create({
    data: {
      userId: user1.id,
      service: 'Google',
      location: 'San Francisco, USA',
      ipAddress: '192.168.1.2',
      status: 'pending',
      timestamp: new Date(),
    },
  });

  console.log('✅ Created MFA approvals');

  // Create email aliases
  console.log('📧 Creating email aliases...');
  await prisma.emailAlias.create({
    data: {
      userId: user1.id,
      alias: 'abc123@relay.unifiedauth.app',
      status: 'active',
      autoExpire: false,
      usedCount: 5,
      lastUsedAt: new Date(),
      replyMasking: true,
      replyMaskingEnabled: true,
      emailsReceived: 10,
      loginsViaAlias: 3,
      trackerDetected: true,
      trackersBlocked: 2,
    },
  });

  await prisma.emailAlias.create({
    data: {
      userId: user1.id,
      alias: 'xyz789@relay.unifiedauth.app',
      status: 'active',
      autoExpire: true,
      usedCount: 1,
      lastUsedAt: new Date(),
    },
  });

  console.log('✅ Created email aliases');

  // Create user theme
  console.log('🎨 Creating user theme...');
  await prisma.userTheme.create({
    data: {
      userId: user1.id,
      themeName: 'default',
      primary: '#6366f1',
      background: '#ffffff',
      surface: '#ffffff',
      text: '#111827',
      textSecondary: '#6b7280',
    },
  });

  console.log('✅ Created user theme');

  // Create vault metadata
  console.log('🔐 Creating vault metadata...');
  await prisma.vaultMetadata.create({
    data: {
      userId: user1.id,
      encrypted: true,
      version: '1.0',
      algorithm: 'AES-256',
    },
  });

  console.log('✅ Created vault metadata');

  // Create audit logs
  console.log('📝 Creating audit logs...');
  await prisma.auditLog.create({
    data: {
      userId: user1.id,
      event: 'login',
      details: JSON.stringify({ method: 'password' }),
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      location: 'New York, USA',
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: user1.id,
      event: 'password_added',
      details: JSON.stringify({ website: 'example.com' }),
      ipAddress: '192.168.1.1',
    },
  });

  console.log('✅ Created audit logs');

  // Create password share
  console.log('🔗 Creating password share...');
  await prisma.passwordShare.create({
    data: {
      passwordId: password1.id,
      sharedByUserId: user1.id,
      sharedWithUserId: user2.id,
      encryptedPassword: 'encrypted_shared_password',
      permission: 'read',
    },
  });

  console.log('✅ Created password share');

  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
