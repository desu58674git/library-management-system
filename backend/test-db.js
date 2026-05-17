/**
 * Quick database connectivity test
 * Run: node test-db.js
 */
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function testConnection() {
  console.log('🔄 Testing database connection...');
  console.log('📡 Host:', process.env.DATABASE_URL?.split('@')[1]?.split('/')[0]);

  let client;
  try {
    client = await pool.connect();
    console.log('✅ Connected to PostgreSQL successfully!\n');

    // Test 1: Basic query
    const timeRes = await client.query('SELECT NOW() AS current_time');
    console.log('🕐 Server time:', timeRes.rows[0].current_time);

    // Test 2: Check tables exist
    const tablesRes = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    if (tablesRes.rows.length === 0) {
      console.log('\n⚠️  No tables found. Run the SQL script first:');
      console.log('   Supabase → SQL Editor → paste complete_postgresql_script.sql → Run\n');
    } else {
      console.log('\n📋 Tables found:');
      tablesRes.rows.forEach(r => console.log('   ✔', r.table_name));
    }

    // Test 3: Row counts (only if tables exist)
    const tableNames = tablesRes.rows.map(r => r.table_name);
    if (tableNames.includes('users')) {
      const counts = await client.query(`
        SELECT
          (SELECT COUNT(*) FROM categories)    AS categories,
          (SELECT COUNT(*) FROM users)         AS users,
          (SELECT COUNT(*) FROM books)         AS books,
          (SELECT COUNT(*) FROM borrow_records) AS borrow_records,
          (SELECT COUNT(*) FROM fines)         AS fines
      `);
      console.log('\n📊 Row counts:');
      const c = counts.rows[0];
      console.log('   Categories    :', c.categories);
      console.log('   Users         :', c.users);
      console.log('   Books         :', c.books);
      console.log('   Borrow Records:', c.borrow_records);
      console.log('   Fines         :', c.fines);
    }

    console.log('\n🎉 Database is ready! You can start the backend now.\n');

  } catch (err) {
    console.error('\n❌ Connection FAILED:', err.message);
    console.error('\n🔍 Troubleshooting:');
    console.error('   1. Check DATABASE_URL in .env is correct');
    console.error('   2. Check DB_SSL=true for Supabase');
    console.error('   3. Check your Supabase project is active');
    console.error('   4. Check password has no special chars that need encoding');
    process.exit(1);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

testConnection();
