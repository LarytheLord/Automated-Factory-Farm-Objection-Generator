const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ SUPABASE_URL and SUPABASE_KEY are required.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

const usersPath = path.join(__dirname, '..', 'data', 'users.json');
const approvalsPath = path.join(__dirname, '..', 'data', 'access-approvals.json');

const ALLOWED_ROLES = new Set(['citizen', 'ngo', 'ngo_admin', 'ngo_member', 'lawyer', 'admin', 'disabled']);

function safeArrayFromFile(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeRole(value) {
  const role = String(value || '').trim().toLowerCase();
  return ALLOWED_ROLES.has(role) ? role : 'citizen';
}

function normalizeApprovalRecord(entry) {
  return {
    user_id: entry?.user_id == null ? null : String(entry.user_id),
    email: normalizeEmail(entry?.email),
    approved: entry?.approved === true,
    note: typeof entry?.note === 'string' && entry.note.trim() ? entry.note.trim().slice(0, 400) : null,
    reviewed_by: entry?.reviewed_by == null ? null : String(entry.reviewed_by),
    reviewed_at: entry?.reviewed_at || null,
  };
}

async function upsertUser(user) {
  const email = normalizeEmail(user?.email);
  if (!email) return null;

  const payload = {
    email,
    password_hash: String(user?.password_hash || '').trim(),
    name: String(user?.name || '').trim() || 'Unknown User',
    role: normalizeRole(user?.role),
  };

  if (!payload.password_hash) {
    return null;
  }

  const { data, error } = await supabase
    .from('users')
    .upsert([payload], { onConflict: 'email' })
    .select('id, email, role')
    .single();
  if (error) throw error;
  return data;
}

async function upsertApproval(user, approval) {
  const approved = user.role === 'admin' ? true : approval?.approved === true;
  const payload = {
    user_id: user.id,
    email: user.email,
    approved,
    note: user.role === 'admin'
      ? (approval?.note || 'Auto-approved admin user')
      : (approval?.note || (approved ? 'Approved (migrated from JSON)' : 'Pending (migrated from JSON)')),
    reviewed_by: approval?.reviewed_by || (user.role === 'admin' ? 'migration' : null),
    reviewed_at: approval?.reviewed_at || (user.role === 'admin' ? new Date().toISOString() : null),
  };

  const { error } = await supabase
    .from('access_approvals')
    .upsert([payload], { onConflict: 'user_id' });
  if (error) throw error;
}

async function run() {
  const users = safeArrayFromFile(usersPath);
  const approvalsRaw = safeArrayFromFile(approvalsPath);
  const approvals = approvalsRaw.map(normalizeApprovalRecord);

  const approvalByUserId = new Map();
  const approvalByEmail = new Map();
  for (const approval of approvals) {
    if (approval.user_id) approvalByUserId.set(approval.user_id, approval);
    if (approval.email) approvalByEmail.set(approval.email, approval);
  }

  if (users.length === 0) {
    console.log('ℹ️ No JSON users found in backend/data/users.json. Nothing to migrate.');
    return;
  }

  let migratedUsers = 0;
  let skippedUsers = 0;
  let upsertedApprovals = 0;

  for (const rawUser of users) {
    try {
      const user = await upsertUser(rawUser);
      if (!user) {
        skippedUsers += 1;
        continue;
      }

      const rawId = rawUser?.id == null ? null : String(rawUser.id);
      const email = normalizeEmail(rawUser?.email);
      const approval = (rawId && approvalByUserId.get(rawId)) || (email && approvalByEmail.get(email)) || null;

      await upsertApproval(user, approval);
      migratedUsers += 1;
      upsertedApprovals += 1;
    } catch (error) {
      skippedUsers += 1;
      console.warn(`⚠️ Skipped user ${rawUser?.email || '(unknown)'}: ${error.message}`);
    }
  }

  console.log('✅ JSON -> Supabase account migration complete');
  console.log(`   Users migrated: ${migratedUsers}`);
  console.log(`   Users skipped: ${skippedUsers}`);
  console.log(`   Approval records upserted: ${upsertedApprovals}`);
}

run().catch((error) => {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
});
