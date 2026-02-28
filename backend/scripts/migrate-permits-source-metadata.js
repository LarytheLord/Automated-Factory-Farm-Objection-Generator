const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { Client } = require('pg');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL is required to run this migration.');
  process.exit(1);
}

const sqlPath = path.join(__dirname, '..', 'database', 'permits-source-metadata.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

async function run() {
  const client = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('✅ permits source metadata migration complete');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

run();
