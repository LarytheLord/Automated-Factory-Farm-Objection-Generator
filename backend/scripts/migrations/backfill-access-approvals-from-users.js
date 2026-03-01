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

async function run() {
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, email, role')
    .order('created_at', { ascending: true });
  if (usersError) throw usersError;

  const { data: approvals, error: approvalsError } = await supabase
    .from('access_approvals')
    .select('user_id, approved, note, reviewed_by, reviewed_at');
  if (approvalsError) throw approvalsError;

  const approvalByUserId = new Map((approvals || []).map((entry) => [String(entry.user_id), entry]));
  const nowIso = new Date().toISOString();

  const upsertPayload = [];
  let createdCount = 0;
  let updatedCount = 0;

  for (const user of users || []) {
    const userId = String(user.id);
    const existing = approvalByUserId.get(userId);
    const isAdmin = String(user.role || '').toLowerCase() === 'admin';

    if (existing) {
      upsertPayload.push({
        user_id: user.id,
        email: user.email || null,
        approved: existing.approved === true,
        note: existing.note || null,
        reviewed_by: existing.reviewed_by || null,
        reviewed_at: existing.reviewed_at || null,
      });
      updatedCount += 1;
      continue;
    }

    upsertPayload.push({
      user_id: user.id,
      email: user.email || null,
      approved: isAdmin,
      note: isAdmin ? 'Auto-approved admin user (backfill)' : 'Pending (backfill)',
      reviewed_by: isAdmin ? 'backfill' : null,
      reviewed_at: isAdmin ? nowIso : null,
    });
    createdCount += 1;
  }

  if (upsertPayload.length === 0) {
    console.log('ℹ️ No users found. Nothing to backfill.');
    return;
  }

  const { error: upsertError } = await supabase
    .from('access_approvals')
    .upsert(upsertPayload, { onConflict: 'user_id' });
  if (upsertError) throw upsertError;

  console.log('✅ Access approval backfill complete');
  console.log(`   Users scanned: ${users.length}`);
  console.log(`   Approval rows created: ${createdCount}`);
  console.log(`   Approval rows updated: ${updatedCount}`);
}

run().catch((error) => {
  console.error('❌ Backfill failed:', error.message);
  process.exit(1);
});
