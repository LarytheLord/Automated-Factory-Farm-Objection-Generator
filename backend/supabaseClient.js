require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_KEY — Supabase will not be used.');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    realtime: { params: { eventsPerSecond: 1 } },
    auth: { persistSession: false },
});

module.exports = supabase;
