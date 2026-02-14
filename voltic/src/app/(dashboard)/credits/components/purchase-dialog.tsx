"use client";

import { useState } from "react";
import { Check, Loader2, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { CREDIT_PACKAGES } from "@/types/credits";
import { track } from "@/lib/analytics/events";

interface PurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PurchaseDialog({ open, onOpenChange }: PurchaseDialogProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function handlePurchase(packageId: string) {
    track("credits_purchase_clicked", { package_id: packageId });
    setLoadingId(packageId);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId }),
      });

      const data = await res.json();

      if (!res.ok || !data.url) {
        toast.error(data.error ?? "Failed to create checkout session");
        setLoadingId(null);
        return;
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch {
      toast.error("Something went wrong. Please try again.");
      setLoadingId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Purchase Credits</DialogTitle>
          <DialogDescription>
            Choose a credit package. You&apos;ll be redirected to Stripe for
            secure payment.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {CREDIT_PACKAGES.map((pkg) => (
            <Card
              key={pkg.id}
              className={`relative ${
                pkg.popular
                  ? "border-emerald-500 shadow-md dark:border-emerald-600"
                  : ""
              }`}
            >
              {pkg.popular && (
                <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-emerald-600">
                  Most Popular
                </Badge>
              )}
              <CardContent className="flex flex-col items-center gap-4 p-6">
                <div className="text-center">
                  <p className="text-3xl font-bold">{pkg.credits}</p>
                  <p className="text-sm text-muted-foreground">credits</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-semibold">${pkg.price}</p>
                  <p className="text-xs text-muted-foreground">
                    ${(pkg.price / pkg.credits).toFixed(3)}/credit
                  </p>
                </div>
                <Button
                  className="w-full"
                  variant={pkg.popular ? "default" : "outline"}
                  onClick={() => handlePurchase(pkg.id)}
                  disabled={loadingId !== null}
                >
                  {loadingId === pkg.id ? (
                    <>
                      <Loader2 className="mr-1.5 size-4 animate-spin" />
                      Redirecting...
                    </>
                  ) : (
                    <>
                      <CreditCard className="mr-1.5 size-4" />
                      Purchase
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <svg viewBox="0 0 24 24" className="size-4" fill="currentColor">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
          </svg>
          Secured by Stripe. Your card details never touch our servers.
        </div>
      </DialogContent>
    </Dialog>
  );
}
