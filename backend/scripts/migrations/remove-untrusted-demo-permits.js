#!/usr/bin/env node
const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const applyDelete = String(process.env.APPLY_DELETE || 'false').toLowerCase() === 'true';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ SUPABASE_URL and SUPABASE_KEY are required.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

function isBlank(value) {
  return !String(value || '').trim();
}

async function run() {
  const { data, error } = await supabase
    .from('permits')
    .select('id,project_title,country,status,notes,submitted_by,created_at')
    .range(0, 10000);
  if (error) throw error;

  const permits = Array.isArray(data) ? data : [];
  const candidates = permits.filter((permit) => permit.submitted_by === null && isBlank(permit.notes));

  console.log(`Total permits scanned: ${permits.length}`);
  console.log(`Untrusted demo candidates (submitted_by is null + blank notes): ${candidates.length}`);

  if (candidates.length > 0) {
    for (const candidate of candidates.slice(0, 60)) {
      console.log(
        ` - ${candidate.id} | ${candidate.project_title} | ${candidate.country} | ${candidate.status} | ${candidate.created_at}`
      );
    }
  }

  if (!applyDelete || candidates.length === 0) {
    console.log(
      applyDelete
        ? 'Nothing to delete.'
        : 'Dry run only. Set APPLY_DELETE=true to remove these rows.'
    );
    return;
  }

  const ids = candidates.map((item) => item.id);
  const { error: deleteError } = await supabase.from('permits').delete().in('id', ids);
  if (deleteError) throw deleteError;

  console.log(`✅ Deleted ${ids.length} untrusted demo permits.`);
}

run().catch((error) => {
  console.error('❌ Failed to remove untrusted demo permits:', error.message);
  process.exit(1);
});

