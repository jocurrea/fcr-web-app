import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "No active session found" });
    }

    const { data, error } = await supabase.rpc("get_my_profile");
    
    // Also fetch the direct company_affiliations to see if RLS blocks it on the server
    const { data: affData, error: affError } = await supabase
      .from("company_affiliations")
      .select("*")
      .eq("user_id", user.id);
    
    const debugData = {
      userId: user.id,
      getMyProfileData: data,
      getMyProfileError: error,
      directAffiliationData: affData,
      directAffiliationError: affError
    };

    fs.writeFileSync(path.join(process.cwd(), "debug-profile.json"), JSON.stringify(debugData, null, 2));
    
    return NextResponse.json({ 
      success: true, 
      message: "Debug data written to debug-profile.json. Please tell the assistant it's ready!" 
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message });
  }
}
