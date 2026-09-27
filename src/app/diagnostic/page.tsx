import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseUrl, supabaseAnonKey } from "@/lib/env";

export default async function DiagnosticPage() {
  const log: string[] = ["Starting server diagnosis..."];
  
  const cookieStore = await cookies();
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      }
    }
  });

  try {
    // 1. Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw new Error("Auth Error: " + authError.message);
    if (!user) {
      log.push("❌ No authenticated user (supabase.auth.getUser() returned null).");
    } else {
      log.push(`✅ Authenticated user: ${user.email} (ID: ${user.id})`);

      // 2. Check Companies Owned
      const { data: companies, error: compError } = await supabase
        .from("companies")
        .select("id, name, owner_user_id")
        .eq("owner_user_id", user.id);

      if (compError) throw new Error("Companies Error: " + compError.message);
      
      if (!companies || companies.length === 0) {
        log.push("⚠️ This user does NOT own any company in the 'companies' table.");
      } else {
        log.push(`✅ Owned companies found: ${companies.map(c => c.name).join(", ")}`);
      }

      // 3. Check RPC again
      const { data: rpcData, error: rpcError } = await supabase.rpc("get_pending_company_affiliation_requests");
      if (rpcError) throw new Error("RPC Error: " + rpcError.message);
      
      log.push(`🔍 RPC Result: ${JSON.stringify(rpcData)}`);
      
      if (Array.isArray(rpcData) && rpcData.length === 0) {
        log.push("⚠️ RPC returned 0 results.");
      }
    }
  } catch (err: any) {
    log.push(`❌ ERROR: ${err.message}`);
  }

  return (
    <div className="p-8 font-mono text-sm bg-gray-900 text-green-400 min-h-screen">
      <h1 className="text-xl text-white mb-4">Database Diagnosis (Server)</h1>
      {log.map((line, i) => (
        <div key={i} className="mb-2">{line}</div>
      ))}
    </div>
  );
}
