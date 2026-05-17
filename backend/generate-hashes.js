/**
 * Generate correct bcrypt hashes for seed passwords
 * Run: node generate-hashes.js
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');

async function generate() {
  const passwords = [
    { label: 'Admin@123',     value: 'Admin@123' },
    { label: 'Librarian@123', value: 'Librarian@123' },
    { label: 'Student@123',   value: 'Student@123' },
  ];

  console.log('Generating bcrypt hashes (cost 10)...\n');
  for (const p of passwords) {
    const hash = await bcrypt.hash(p.value, 10);
    console.log(`${p.label}:`);
    console.log(`  ${hash}\n`);
  }
}

generate();
