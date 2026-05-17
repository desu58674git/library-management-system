/**
 * Reset all user passwords to correct values
 * Run: node reset-passwords.js
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { query, pool } = require('./src/config/database');

async function resetPasswords() {
  console.log('🔄 Resetting user passwords...\n');

  const users = [
    { email: 'admin@library.com',     password: 'Admin@123' },
    { email: 'librarian@library.com', password: 'Librarian@123' },
    { email: 'student@library.com',   password: 'Student@123' },
    { email: 'alice@library.com',     password: 'Student@123' },
    { email: 'bob@library.com',       password: 'Student@123' },
    { email: 'carol@library.com',     password: 'Student@123' },
    { email: 'david@library.com',     password: 'Student@123' },
  ];

  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 10);
    const result = await query(
      'UPDATE users SET password = $1 WHERE email = $2 RETURNING email, role',
      [hash, u.email]
    );
    if (result.rows.length > 0) {
      console.log(`✅ ${result.rows[0].email} (${result.rows[0].role}) → ${u.password}`);
    } else {
      console.log(`⚠️  Not found: ${u.email}`);
    }
  }

  console.log('\n🎉 Passwords reset successfully!');
  console.log('\n📋 Login credentials:');
  console.log('  Admin:     admin@library.com     / Admin@123');
  console.log('  Librarian: librarian@library.com / Librarian@123');
  console.log('  Student:   student@library.com   / Student@123');

  await pool.end();
}

resetPasswords().catch((err) => {
  console.error('❌ Failed:', err.message);
  process.exit(1);
});
