const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://localhost:5432/affog_development';

async function migrate() {
    const client = new Client({ connectionString: DATABASE_URL });

    try {
        console.log('🔌 Connecting to database...');
        await client.connect();

        console.log('📋 Running schema migration...');
        const schemaSQL = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
        await client.query(schemaSQL);

        console.log('✅ Migration completed successfully!');
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

if (require.main === module) {
    migrate();
}

module.exports = { migrate };
