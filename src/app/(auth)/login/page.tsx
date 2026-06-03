import Link from "next/link";
import { KeyRound } from "lucide-react";

import { signInWithGoogle, signInWithPassword } from "@/app/(auth)/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error, message } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-6 py-10">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-2xl">Log in to Flight Crew</CardTitle>
          <CardDescription>
            Continue with Google or use your email and password.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {message ? (
            <Alert>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          ) : null}

          <form action={signInWithGoogle}>
            <Button className="w-full" type="submit" variant="outline">
              <KeyRound className="size-4" />
              Continue with Google
            </Button>
          </form>

          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">or</span>
            <Separator className="flex-1" />
          </div>

          <form action={signInWithPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </div>
            <Button className="w-full" type="submit">
              Log in
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            New to Flight Crew?{" "}
            <Link className="font-medium text-foreground underline" href="/register">
              Create an account
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
