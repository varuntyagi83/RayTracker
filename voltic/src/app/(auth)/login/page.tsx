"use client";

import { SignIn } from "@clerk/nextjs";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <SignIn
        afterSignInUrl="/home"
        appearance={{
          elements: {
            rootBox: "w-full max-w-md",
            card: "shadow-lg border border-border bg-card rounded-xl",
            headerTitle: "text-2xl font-semibold text-card-foreground",
            headerSubtitle: "text-muted-foreground",
            formButtonPrimary: "bg-emerald-600 hover:bg-emerald-700",
            footerActionLink: "text-emerald-600 hover:text-emerald-700",
          },
        }}
      />
    </div>
  );
}
