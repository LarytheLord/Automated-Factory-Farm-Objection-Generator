require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.warn('⚠️  Missing SUPABASE_URL or SUPABASE_KEY. Backend will fail to connect.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
