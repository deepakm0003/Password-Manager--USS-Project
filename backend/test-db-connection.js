// Test MySQL Database Connection
// Run: node test-db-connection.js

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testConnection() {
  try {
    console.log('🔌 Testing PostgreSQL database connection...');
    console.log('📋 Database URL:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@')); // Hide password
    
    // Test connection
    await prisma.$connect();
    console.log('✅ Database connection successful!');
    
    // Test query (PostgreSQL-specific)
    const result = await prisma.$queryRaw`SELECT 1 as test, current_database() as current_database, current_user as current_user`;
    console.log('✅ Database query successful!');
    console.log('📊 Query result:', result);
    
    // Test Prisma Client
    const userCount = await prisma.user.count();
    console.log(`✅ Prisma Client working! Current users in database: ${userCount}`);
    
    console.log('\n🎉 All tests passed! Database is ready to use.');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Possible solutions:');
      console.error('   - Check if PostgreSQL server is running');
      console.error('   - Verify host and port in DATABASE_URL (default: 5432)');
      console.error('   - Check firewall settings');
    } else if (error.code === 'P1001' || error.message.includes('Access denied') || error.message.includes('password authentication failed')) {
      console.error('\n💡 Possible solutions:');
      console.error('   - Check username and password in DATABASE_URL');
      console.error('   - Verify user has permissions on database');
      console.error('   - For PostgreSQL 15+: GRANT ALL ON SCHEMA public TO user;');
      console.error('   - Try connecting with postgres user first');
    } else if (error.code === 'P1003' || error.message.includes('does not exist')) {
      console.error('\n💡 Possible solutions:');
      console.error('   - Create database: CREATE DATABASE unified_auth_manager;');
      console.error('   - Check database name in DATABASE_URL');
    } else if (error.message.includes('permission denied for schema')) {
      console.error('\n💡 Possible solutions:');
      console.error('   - Grant schema privileges: GRANT ALL ON SCHEMA public TO user;');
      console.error('   - Grant table privileges: GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO user;');
    }
    
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();

