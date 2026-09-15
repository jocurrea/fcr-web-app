"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function DiagnosticPage() {
  const [log, setLog] = useState<string[]>(["Iniciando diagnóstico..."]);
  const supabase = createClient();

  const addLog = (msg: string) => setLog(prev => [...prev, msg]);

  useEffect(() => {
    async function runDiagnostics() {
      try {
        // 1. Get current user
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw new Error("Auth Error: " + sessionError.message);
        if (!session?.user) {
          addLog("❌ No hay usuario autenticado.");
          return;
        }
        addLog(`✅ Usuario autenticado: ${session.user.email} (ID: ${session.user.id})`);

        // 2. Check Companies Owned
        const { data: companies, error: compError } = await supabase
          .from("companies")
          .select("id, name, owner_user_id")
          .eq("owner_user_id", session.user.id);

        if (compError) throw new Error("Companies Error: " + compError.message);
        
        if (!companies || companies.length === 0) {
          addLog("⚠️ Este usuario NO es dueño de ninguna empresa en la tabla 'companies'.");
        } else {
          addLog(`✅ Empresas propias encontradas: ${companies.map(c => c.name).join(", ")}`);
        }

        // 3. Check RPC again
        const { data: rpcData, error: rpcError } = await supabase.rpc("get_pending_company_affiliation_requests");
        if (rpcError) throw new Error("RPC Error: " + rpcError.message);
        
        addLog(`🔍 Resultado del RPC: ${JSON.stringify(rpcData)}`);
        
        if (Array.isArray(rpcData) && rpcData.length === 0) {
          addLog("⚠️ El RPC devolvió 0 resultados.");
          addLog("👉 Esto significa que la base de datos dice que no hay solicitudes pendientes para las empresas de este usuario, O que la función SQL 'get_pending_company_affiliation_requests' tiene un filtro que no está coincidiendo (por ejemplo, verifica roles de admin en lugar de owner).");
        }

      } catch (err: any) {
        addLog(`❌ ERROR: ${err.message}`);
      }
    }
    
    runDiagnostics();
  }, []);

  return (
    <div className="p-8 font-mono text-sm bg-gray-900 text-green-400 min-h-screen">
      <h1 className="text-xl text-white mb-4">Diagnóstico de Base de Datos</h1>
      {log.map((line, i) => (
        <div key={i} className="mb-2">{line}</div>
      ))}
    </div>
  );
}
