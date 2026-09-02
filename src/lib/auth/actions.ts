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

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(`/login?error=${safeRedirectParam(error.message)}`);
  }

  if (data?.user) {
    const { data: userRecord } = await supabase
      .from("users")
      .select("id, onboarded, accountType, role")
      .eq("id", data.user.id)
      .maybeSingle();

    const isOnboarded =
      userRecord?.onboarded === 1 ||
      userRecord?.onboarded === true ||
      String(userRecord?.onboarded) === "1" ||
      String(userRecord?.onboarded).toLowerCase() === "true" ||
      data.user.user_metadata?.onboarded === true;

    const effectiveRole =
      userRecord?.accountType ||
      userRecord?.role ||
      data.user.user_metadata?.accountType ||
      "";

    if (isOnboarded) {
      redirect("/home");
    }

    if (effectiveRole === "business") {
      redirect("/onboarding-business");
    }

    redirect("/role-selection");
  }

  redirect("/home");
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
      emailRedirectTo: `${origin}/auth/callback?next=/role-selection`,
      data: {
        onboarded: false,
        platformRole: "user",
        role: null,
        professionalRole: null,
      },
    },
  });

  if (error) {
    redirect(`/register?error=${safeRedirectParam(error.message)}`);
  }

  if (data.session && data.user) {
    try {
      await supabase.from("users").upsert({
        id: data.user.id,
        email: email.trim().toLowerCase(),
        onboarded: 0,
        role: null,
        professionalRole: null,
      }, { onConflict: "id" });
    } catch {
      // ignore
    }

    redirect("/role-selection");
  }

  redirect(
    `/register?verifyEmail=${safeRedirectParam(email)}`
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
