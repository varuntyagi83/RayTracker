"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { track } from "@/lib/analytics/events";
import { createWorkspace } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [existingUserId, setExistingUserId] = useState<string | null>(null);

  // Check if user is already authenticated (e.g. Google OAuth without workspace)
  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setExistingUserId(user.id);
        setEmail(user.email ?? "");
      }
    }
    checkAuth();
  }, []);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    track("signup_started");

    // If user isn't already authenticated, create account first
    if (!existingUserId) {
      const supabase = createClient();
      const { data: authData, error: authError } =
        await supabase.auth.signUp({ email, password });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      if (!authData.user) {
        setError("Signup failed. Please try again.");
        setLoading(false);
        return;
      }
    }

    // Create workspace + membership via server action
    const result = await createWorkspace(workspaceName);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    track("signup_completed", { method: existingUserId ? "google" : "email" });
    router.push("/home");
    router.refresh();
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-xl font-bold text-white">
          V
        </div>
        <CardTitle className="text-2xl">
          {existingUserId ? "Create your workspace" : "Create your account"}
        </CardTitle>
        <CardDescription>
          {existingUserId
            ? "One more step — name your workspace to get started"
            : "Get started with Voltic in seconds"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSignup} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="workspace">Workspace name</Label>
            <Input
              id="workspace"
              type="text"
              placeholder="My Company"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              required
            />
          </div>
          {!existingUserId && (
            <>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            </>
          )}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <Button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-700"
            disabled={loading}
          >
            {loading
              ? existingUserId
                ? "Creating workspace..."
                : "Creating account..."
              : existingUserId
                ? "Create workspace"
                : "Create account"}
          </Button>
        </form>
      </CardContent>
      {!existingUserId && (
        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-emerald-600 hover:underline font-medium"
            >
              Log in
            </Link>
          </p>
        </CardFooter>
      )}
    </Card>
  );
}
