"use client";

import { SignIn } from "@clerk/nextjs";

export default function LoginPage() {
  return (
    <SignIn
      forceRedirectUrl="/home"
      appearance={{
        elements: {
          rootBox: "w-full",
          card: "shadow-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-2xl",
          headerTitle: "text-xl font-semibold",
          headerSubtitle: "text-muted-foreground text-sm",
          formButtonPrimary:
            "bg-emerald-600 hover:bg-emerald-700 shadow-sm shadow-emerald-500/20",
          footerActionLink: "text-emerald-600 hover:text-emerald-700 font-medium",
          socialButtonsBlockButton:
            "border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900",
          formFieldInput:
            "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus:ring-emerald-500/20",
          dividerLine: "bg-zinc-200 dark:bg-zinc-800",
          dividerText: "text-zinc-400 text-xs",
        },
      }}
    />
  );
}
