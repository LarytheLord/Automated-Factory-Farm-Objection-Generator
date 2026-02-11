const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/affog_development',
    ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
    console.error('❌ Unexpected database error:', err);
});

pool.on('connect', () => {
    console.log('✅ Database connected');
});

module.exports = pool;
