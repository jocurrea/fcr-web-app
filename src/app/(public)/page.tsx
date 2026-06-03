import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-6">
        <nav className="flex items-center justify-between">
          <Link href="/" className="text-sm font-semibold tracking-wide">
            Flight Crew
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className={cn(buttonVariants({ variant: "ghost" }))}
            >
              Log in
            </Link>
            <Link href="/register" className={cn(buttonVariants())}>
              Create account
            </Link>
          </div>
        </nav>

        <div className="grid flex-1 items-center gap-12 py-16 lg:grid-cols-[1fr_420px]">
          <div className="max-w-2xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm text-muted-foreground">
              <ShieldCheck className="size-4" />
              Separate web experience for Flight Crew
            </div>
            <h1 className="text-4xl font-semibold tracking-normal text-balance sm:text-5xl">
              Flight Crew on the web, built cleanly from the ground up.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
              This standalone Next.js app starts with authentication, protected
              pages, and environment-aware Supabase wiring before the web
              product grows into its full experience.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className={cn(buttonVariants({ size: "lg" }))}
              >
                Continue
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/dashboard"
                className={cn(
                  buttonVariants({ size: "lg", variant: "outline" })
                )}
              >
                Open dashboard
              </Link>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-6 text-card-foreground shadow-sm">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Initial scope</p>
              <h2 className="text-xl font-semibold">Auth foundation</h2>
            </div>
            <div className="mt-6 grid gap-3 text-sm">
              {[
                "Public route shell",
                "Protected dashboard route",
                "Supabase SSR session refresh",
                "Staging and production env switching",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-lg border bg-background px-3 py-2"
                >
                  <span className="size-2 rounded-full bg-primary" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
