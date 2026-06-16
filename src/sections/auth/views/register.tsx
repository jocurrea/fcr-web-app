"use client";

import { useState } from "react";
import Link from "next/link";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUpWithPassword } from "@/lib/auth/actions";
import { AuthBrand } from "@/sections/auth/auth-brand";

type RegisterProps = {
  error?: string;
};

export function Register({ error }: RegisterProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmError, setConfirmError] = useState("");

  const validateEmail = (val: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!val) return "Email is required.";
    if (!emailRegex.test(val)) return "Please enter a valid email address.";
    return "";
  };

  const validatePassword = (val: string) => {
    if (!val) return "Password is required.";
    if (val.length < 8) return "Password must be at least 8 characters.";
    if (!/[A-Z]/.test(val)) return "Password must contain at least one uppercase letter.";
    if (!/[a-z]/.test(val)) return "Password must contain at least one lowercase letter.";
    if (!/[0-9]/.test(val)) return "Password must contain at least one number.";
    return "";
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const eErr = validateEmail(email);
    const pErr = validatePassword(password);
    const cErr = confirmPassword && password !== confirmPassword ? "Passwords do not match." : (!confirmPassword ? "Please confirm your password." : "");

    setEmailError(eErr);
    setPasswordError(pErr);
    setConfirmError(cErr);

    if (eErr || pErr || cErr) {
      e.preventDefault();
      return;
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-6 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <AuthBrand
            title="Create your account"
            description="Set up web access for your Flight Crew profile."
          />
        </CardHeader>
        <CardContent className="space-y-5">
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <form action={signUpWithPassword} onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError("");
                }}
                className={emailError ? "border-red-500" : ""}
                required
              />
              {emailError && <p className="text-red-500 text-xs">{emailError}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError("");
                }}
                className={passwordError ? "border-red-500" : ""}
                required
              />
              {passwordError && <p className="text-red-500 text-xs">{passwordError}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (confirmError) setConfirmError("");
                }}
                className={confirmError ? "border-red-500" : ""}
                required
              />
              {confirmError && <p className="text-red-500 text-xs">{confirmError}</p>}
            </div>

            <Button className="w-full" type="submit">
              Create account
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link className="font-medium text-foreground underline" href="/login">
              Log in
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
