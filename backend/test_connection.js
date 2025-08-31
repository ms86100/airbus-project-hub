// Simple test script to verify backend setup
require('dotenv').config();
const pool = require('./db_backend');

async function testConnection() {
  try {
    console.log('Testing database connection...');
    
    // Test basic connection
    const result = await pool.query('SELECT NOW() as current_time');
    console.log('✅ Database connected successfully:', result.rows[0].current_time);
    
    // Test if projects table exists
    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'projects', 'milestones', 'tasks', 'user_roles', 'module_permissions')
    `);
    
    console.log('📋 Existing tables:', tableCheck.rows.map(r => r.table_name));
    
    if (tableCheck.rows.length === 0) {
      console.log('⚠️  No tables found. You may need to run the database migrations.');
      console.log('💡 Run: psql -h localhost -U postgres -d project_management -f init_tables.sql');
    }
    
    // Test a simple user query if users table exists
    const hasUsersTable = tableCheck.rows.some(r => r.table_name === 'users');
    if (hasUsersTable) {
      const userCount = await pool.query('SELECT COUNT(*) as count FROM users');
      console.log('👥 Users in database:', userCount.rows[0].count);
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Make sure PostgreSQL is running');
    console.log('2. Check your .env file configuration');
    console.log('3. Ensure the database "project_management" exists');
    console.log('4. Verify user credentials');
    
    process.exit(1);
  }
}

testConnection();