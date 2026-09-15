import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseUrl, supabaseAnonKey } from "@/lib/env";

export default async function DiagnosticPage() {
  const log: string[] = ["Iniciando diagnóstico en el servidor..."];
  
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
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw new Error("Auth Error: " + sessionError.message);
    if (!session?.user) {
      log.push("❌ No hay usuario autenticado.");
    } else {
      log.push(`✅ Usuario autenticado: ${session.user.email} (ID: ${session.user.id})`);

      // 2. Check Companies Owned
      const { data: companies, error: compError } = await supabase
        .from("companies")
        .select("id, name, owner_user_id")
        .eq("owner_user_id", session.user.id);

      if (compError) throw new Error("Companies Error: " + compError.message);
      
      if (!companies || companies.length === 0) {
        log.push("⚠️ Este usuario NO es dueño de ninguna empresa en la tabla 'companies'.");
      } else {
        log.push(`✅ Empresas propias encontradas: ${companies.map(c => c.name).join(", ")}`);
      }

      // 3. Check RPC again
      const { data: rpcData, error: rpcError } = await supabase.rpc("get_pending_company_affiliation_requests");
      if (rpcError) throw new Error("RPC Error: " + rpcError.message);
      
      log.push(`🔍 Resultado del RPC: ${JSON.stringify(rpcData)}`);
      
      if (Array.isArray(rpcData) && rpcData.length === 0) {
        log.push("⚠️ El RPC devolvió 0 resultados.");
      }
    }
  } catch (err: any) {
    log.push(`❌ ERROR: ${err.message}`);
  }

  return (
    <div className="p-8 font-mono text-sm bg-gray-900 text-green-400 min-h-screen">
      <h1 className="text-xl text-white mb-4">Diagnóstico de Base de Datos (Servidor)</h1>
      {log.map((line, i) => (
        <div key={i} className="mb-2">{line}</div>
      ))}
    </div>
  );
}
