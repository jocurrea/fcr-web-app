import { createClient } from "@supabase/supabase-js";
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error("Missing SUPABASE URL or SERVICE KEY in .env");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  console.log("--- COMPANIES ---");
  const { data: companies, error: compErr } = await supabase.from('companies').select('*');
  if (compErr) console.error(compErr);
  else console.log(companies?.map(c => `[${c.id}] ${c.name} (Owner: ${c.owner_user_id})`));

  console.log("\n--- AFFILIATION REQUESTS (PENDING) ---");
  const { data: pending, error: pendErr } = await supabase.from('company_affiliations').select('*').eq('status', 'pending');
  if (pendErr) console.error(pendErr);
  else console.log(pending);

  console.log("\n--- ALL AFFILIATIONS ---");
  const { data: all, error: allErr } = await supabase.from('company_affiliations').select('*');
  if (allErr) console.error(allErr);
  else console.log(all);
}

run();
