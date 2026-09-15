const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1];
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.rpc('execute_sql', { query: "SELECT pg_get_constraintdef(c.oid) AS constraint_def FROM pg_constraint c WHERE c.conname = 'user_profiles_professional_location_check';" });
  console.log("RPC result:", data || error);
}
run();
