/**
 * Database Seed Script
 * Inserts sample data into the database
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function seed() {
  const client = await pool.connect();
  try {
    console.log('🌱 Seeding database...');
    const seedSQL = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8');
    await client.query(seedSQL);
    console.log('✅ Database seeded successfully!');
    console.log('');
    console.log('📋 Default Credentials:');
    console.log('  Admin:     admin@library.com     / Admin@123');
    console.log('  Librarian: librarian@library.com / Librarian@123');
    console.log('  Student:   student@library.com   / Student@123');
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
