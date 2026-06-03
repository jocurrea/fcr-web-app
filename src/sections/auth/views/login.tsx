import Link from "next/link";
import Image from "next/image";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { signInWithGoogle, signInWithPassword } from "@/lib/auth/actions";
import { AuthBrand } from "@/sections/auth/auth-brand";

type LoginProps = {
  error?: string;
  message?: string;
};

export function Login({ error, message }: LoginProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-6 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <AuthBrand
            title="Log in to Flight Crew"
            description="Continue with Google or use your email and password."
          />
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

          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">or</span>
            <Separator className="flex-1" />
          </div>

          <form action={signInWithGoogle}>
            <Button className="w-full" type="submit" variant="outline">
              <Image
                src="/google-logo.png"
                alt=""
                width={16}
                height={16}
                aria-hidden="true"
              />
              Continue with Google
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            New to Flight Crew?{" "}
            <Link
              className="font-medium text-foreground underline"
              href="/register"
            >
              Create an account
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
