import { Home } from "@/sections/home/views";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

type HomePageProps = {
  searchParams: Promise<{
    code?: string;
  }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const { code } = await searchParams;
  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      redirect(`/login?error=${encodeURIComponent(error.message)}`);
    }

    redirect("/");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <Home />;
}
