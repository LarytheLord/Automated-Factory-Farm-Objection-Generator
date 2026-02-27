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

const sqlPath = path.join(__dirname, '..', 'database', 'access-approvals.sql');
const approvalsPath = path.join(__dirname, '..', 'data', 'access-approvals.json');

const sql = fs.readFileSync(sqlPath, 'utf8');

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || '').trim());
}

function readLocalApprovals() {
  try {
    const raw = fs.readFileSync(approvalsPath, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function run() {
  const client = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    await client.query('BEGIN');
    await client.query(sql);

    const localApprovals = readLocalApprovals();
    let migrated = 0;
    let skipped = 0;

    for (const entry of localApprovals) {
      const userId = String(entry?.user_id || '').trim();
      if (!isUuid(userId)) {
        skipped += 1;
        continue;
      }

      await client.query(
        `
          INSERT INTO access_approvals (
            user_id, email, approved, note, reviewed_by, reviewed_at, created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, NOW()), COALESCE($8, NOW()))
          ON CONFLICT (user_id)
          DO UPDATE SET
            email = EXCLUDED.email,
            approved = EXCLUDED.approved,
            note = EXCLUDED.note,
            reviewed_by = EXCLUDED.reviewed_by,
            reviewed_at = EXCLUDED.reviewed_at,
            updated_at = NOW();
        `,
        [
          userId,
          entry?.email || null,
          entry?.approved === true,
          entry?.note || null,
          entry?.reviewed_by || null,
          entry?.reviewed_at || null,
          entry?.created_at || null,
          entry?.updated_at || null,
        ]
      );

      migrated += 1;
    }

    await client.query('COMMIT');
    console.log('✅ access_approvals migration complete');
    console.log(`   Migrated local approvals: ${migrated}`);
    console.log(`   Skipped local entries: ${skipped}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

run();
