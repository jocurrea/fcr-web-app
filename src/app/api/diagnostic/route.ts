import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseUrl, supabaseAnonKey } from "@/lib/env";

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      }
    }
  });

  const response: any = {};

  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      response.authError = sessionError.message;
    } else if (!session?.user) {
      response.user = "No hay usuario autenticado. La cookie de sesion no llego o caduco.";
    } else {
      response.user = `Autenticado: ${session.user.email} (ID: ${session.user.id})`;

      const { data: companies, error: compError } = await supabase
        .from("companies")
        .select("id, name, owner_user_id")
        .eq("owner_user_id", session.user.id);

      if (compError) {
        response.companiesError = compError.message;
      } else {
        response.companies = companies;
      }

      const { data: rpcData, error: rpcError } = await supabase.rpc("get_pending_company_affiliation_requests");
      if (rpcError) {
        response.rpcError = rpcError.message;
      } else {
        response.rpcResult = rpcData;
      }
    }
  } catch (err: any) {
    response.exception = err.message;
  }

  return NextResponse.json(response);
}
