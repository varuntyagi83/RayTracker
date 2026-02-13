"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { resetPostHog, trackEvent } from "@/lib/analytics/posthog-provider";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    trackEvent("user_logged_out");
    resetPostHog();

    const supabase = createClient();
    await supabase.auth.signOut();

    router.push("/login");
    router.refresh();
  }

  return (
    <Button variant="outline" onClick={handleLogout}>
      Log out
    </Button>
  );
}
