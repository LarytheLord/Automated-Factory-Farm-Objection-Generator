require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
    console.log('🌱 Seeding database via Supabase API...');

    // 1. Load permits from JSON
    const permitsPath = path.join(__dirname, '../permits.json');
    const permitsData = JSON.parse(fs.readFileSync(permitsPath, 'utf8'));

    console.log(`📋 Found ${permitsData.length} permits to seed.`);

    // 2. Prepare data for insertion (map JSON fields to DB columns if needed)
    // The JSON structure matches the DB schema mostly (snake_case)
    // We need to ensure 'coordinates' is valid JSONB
    const permitsToInsert = permitsData.map(p => {
        let status = (p.status || 'pending').toLowerCase();
        // Normalize status to match DB constraint: pending, approved, rejected, under_review
        if (status === 'in process' || status === 'processing') status = 'pending';
        // If still not valid, default to pending
        const validStatuses = ['pending', 'approved', 'rejected', 'under_review'];
        if (!validStatuses.includes(status)) status = 'pending';

        return {
            project_title: p.project_title,
            location: p.location,
            country: p.country,
            activity: p.activity,
            status: status,
            category: p.category || 'Unknown',
            capacity: p.capacity,
            species: p.species,
            coordinates: p.coordinates,
            notes: p.notes,
            created_at: new Date().toISOString()
        };
    });

    // 3. Clear existing data (optional, but good for idempotency)
    // Note: delete() requires a filter in supabase-js, so we use .neq('id', '00000000-0000-0000-0000-000000000000') hack or specialized logic
    // For now, let's just insert. If we get duplicates, we handle error.

    // logic: Delete all permits to start fresh? 
    // const { error: deleteError } = await supabase.from('permits').delete().neq('project_title', 'ZZZZZZ'); // hacky delete all

    // Used upsert to avoid duplicates if ID is present, but here we don't have IDs in JSON
    // We will just insert and hope for empty DB or use strict checking.
    // Actually, asking user to clear DB is risky. Let's just insert.

    const { data, error } = await supabase
        .from('permits')
        .insert(permitsToInsert)
        .select();

    if (error) {
        console.error('❌ Failed to insert permits:', error.message);
    } else {
        console.log(`✅ Successfully inserted ${data.length} permits.`);
    }

    // 4. Create some activity logs
    const activities = [
        { action: 'permit_added', target: 'Mega Clean Air Project', country: 'USA' },
        { action: 'objection_generated', target: 'Pune Poultry Unit', country: 'India' },
        { action: 'permit_updated', target: 'Bavaria Swine Facility', country: 'Germany' }
    ];

    const { error: activityError } = await supabase
        .from('activity_log')
        .insert(activities);

    if (activityError) {
        console.error('❌ Failed to insert activity logs:', activityError.message);
    } else {
        console.log('✅ Inserted sample activity logs.');
    }
}

seed();
