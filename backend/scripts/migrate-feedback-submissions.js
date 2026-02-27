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

const sqlPath = path.join(__dirname, '..', 'database', 'feedback-submissions.sql');
const feedbackPath = path.join(__dirname, '..', 'data', 'feedback-submissions.json');
const sql = fs.readFileSync(sqlPath, 'utf8');

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || '').trim());
}

function readLocalFeedback() {
  try {
    const raw = fs.readFileSync(feedbackPath, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function trimOrNull(value, max = 4000) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function normalizeFeedbackType(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'suggestion' || normalized === 'issue' || normalized === 'feedback') {
    return normalized;
  }
  return null;
}

function normalizeRating(value) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 5) return null;
  return parsed;
}

async function run() {
  const client = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    await client.query('BEGIN');
    await client.query(sql);

    const localFeedback = readLocalFeedback();
    let migrated = 0;
    let skipped = 0;

    for (const entry of localFeedback) {
      const feedbackType = normalizeFeedbackType(entry?.feedback_type || entry?.feedbackType);
      const name = trimOrNull(entry?.name, 120);
      const email = trimOrNull(entry?.email, 255)?.toLowerCase() || null;
      const suggestion = trimOrNull(entry?.suggestion);
      const issueDescription = trimOrNull(entry?.issue_description || entry?.issueDescription);
      const additionalComments = trimOrNull(entry?.additional_comments || entry?.additionalComments);
      const role = trimOrNull(entry?.role, 80);
      const rating = normalizeRating(entry?.rating);
      const source = trimOrNull(entry?.source, 40) || 'json_migration';
      const createdAt = entry?.created_at || entry?.createdAt || new Date().toISOString();
      const updatedAt = entry?.updated_at || entry?.updatedAt || createdAt;
      const userId = isUuid(entry?.user_id || entry?.userId) ? String(entry?.user_id || entry?.userId) : null;

      if (!feedbackType || !name || !email) {
        skipped += 1;
        continue;
      }
      if (feedbackType === 'suggestion' && !suggestion) {
        skipped += 1;
        continue;
      }
      if (feedbackType === 'issue' && !issueDescription) {
        skipped += 1;
        continue;
      }

      await client.query(
        `
          INSERT INTO feedback_submissions (
            user_id,
            name,
            email,
            role,
            feedback_type,
            suggestion,
            issue_description,
            rating,
            additional_comments,
            source,
            created_at,
            updated_at
          )
          SELECT
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
          WHERE NOT EXISTS (
            SELECT 1
            FROM feedback_submissions
            WHERE email = $3
              AND feedback_type = $5
              AND COALESCE(suggestion, '') = COALESCE($6, '')
              AND COALESCE(issue_description, '') = COALESCE($7, '')
              AND COALESCE(additional_comments, '') = COALESCE($9, '')
              AND created_at = $11
          );
        `,
        [
          userId,
          name,
          email,
          role,
          feedbackType,
          suggestion,
          issueDescription,
          rating,
          additionalComments,
          source,
          createdAt,
          updatedAt,
        ]
      );

      migrated += 1;
    }

    await client.query('COMMIT');
    console.log('✅ feedback_submissions migration complete');
    console.log(`   Migrated local records: ${migrated}`);
    console.log(`   Skipped invalid records: ${skipped}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

run();
