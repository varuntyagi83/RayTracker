"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function CheckoutSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    // Auto-redirect after 5 seconds
    const timer = setTimeout(() => {
      router.push("/credits");
    }, 5000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-8">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950">
            <CheckCircle2 className="size-8 text-emerald-600" />
          </div>
          <CardTitle className="text-xl">Payment Successful!</CardTitle>
          <CardDescription>
            Your credits have been added to your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sessionId && (
            <p className="text-xs text-muted-foreground">
              Session: {sessionId.slice(0, 20)}...
            </p>
          )}
          <Button onClick={() => router.push("/credits")} className="w-full">
            View Credits
          </Button>
          <p className="text-xs text-muted-foreground">
            Redirecting automatically in 5 seconds...
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
