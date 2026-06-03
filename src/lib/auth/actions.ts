"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { siteUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

const safeRedirectParam = (value: string) => encodeURIComponent(value);

const getOrigin = async () => {
  const headerStore = await headers();
  return headerStore.get("origin") ?? siteUrl;
};

export async function signInWithPassword(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(`/login?error=${safeRedirectParam(error.message)}`);
  }

  redirect("/");
}

export async function signUpWithPassword(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const origin = await getOrigin();
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/`,
    },
  });

  if (error) {
    redirect(`/register?error=${safeRedirectParam(error.message)}`);
  }

  if (data.session) {
    redirect("/");
  }

  redirect(
    `/login?message=${safeRedirectParam("Check your email to confirm your account.")}`
  );
}

export async function signInWithGoogle() {
  const origin = await getOrigin();
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=/`,
    },
  });

  if (error) {
    redirect(`/login?error=${safeRedirectParam(error.message)}`);
  }

  if (data.url) {
    redirect(data.url);
  }

  redirect(
    `/login?error=${safeRedirectParam("Google sign-in did not return a redirect URL.")}`
  );
}

export async function signOut() {
  const supabase = await createClient();

  await supabase.auth.signOut();

  redirect("/login");
}
