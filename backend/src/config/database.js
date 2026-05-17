/**
 * PostgreSQL Database Configuration
 * Optimized for Supabase free tier — creates fresh connection per query
 * to avoid timeout issues with the connection pooler
 */
const { Pool } = require('pg');

let pool = createPool();

function createPool() {
  const p = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 2,
    min: 0,
    idleTimeoutMillis: 3000,
    connectionTimeoutMillis: 20000,
    allowExitOnIdle: true,
  });

  p.on('error', (err) => {
    console.error('❌ Pool error, recreating pool:', err.message);
    pool = createPool();
  });

  return p;
}

/**
 * Execute a query with auto-reconnect on timeout
 */
const query = async (text, params) => {
  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await pool.query(text, params);
      if (attempt > 1) console.log(`✅ Query succeeded on attempt ${attempt}`);
      return result;
    } catch (err) {
      lastErr = err;
      const isTimeout = err.message && (
        err.message.includes('timeout') ||
        err.message.includes('terminated') ||
        err.message.includes('Connection ended')
      );
      if (isTimeout && attempt < 3) {
        console.warn(`⚠️  Connection issue (attempt ${attempt}), retrying...`);
        // Recreate pool on timeout
        try { await pool.end(); } catch (_) {}
        pool = createPool();
        await new Promise(r => setTimeout(r, 1000 * attempt));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
};

/**
 * Get a client for transactions
 */
const getClient = async () => {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await pool.connect();
    } catch (err) {
      if (attempt < 3) {
        console.warn(`⚠️  Client connect failed (attempt ${attempt}), retrying...`);
        try { await pool.end(); } catch (_) {}
        pool = createPool();
        await new Promise(r => setTimeout(r, 1000 * attempt));
        continue;
      }
      throw err;
    }
  }
};

// Test connection on startup
(async () => {
  try {
    await pool.query('SELECT 1');
    console.log('✅ PostgreSQL connected');
  } catch (err) {
    console.error('❌ Initial connection failed:', err.message);
  }
})();

module.exports = { query, getClient, pool: new Proxy({}, { get: (_, prop) => pool[prop] }) };
