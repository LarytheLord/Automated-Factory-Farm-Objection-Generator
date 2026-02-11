const { Client } = require('pg');
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL;

console.log('🔍 Testing database connection...');
console.log('URL (masked):', DATABASE_URL.replace(/:([^:@]+)@/, ':****@'));

async function testConnection() {
    console.log('--- Testing SSL Connection ---');
    console.log('URL (masked):', DATABASE_URL.replace(/:([^:@]+)@/, ':****@'));

    const client = new Client({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 30000 // 30s timeout
    });

    try {
        await client.connect();
        console.log('✅ Success! SSL connection working.');
        const res = await client.query('SELECT NOW()');
        console.log('   Database time:', res.rows[0].now);
        await client.end();
    } catch (err) {
        console.error('❌ Failed:', err.message);
        if (err.code) console.error('   Code:', err.code);
        if (err.detail) console.error('   Detail:', err.detail);
        if (err.hint) console.error('   Hint:', err.hint);
        // await client.end(); // Don't end if it failed to connect, just exit
    }
}

testConnection();
