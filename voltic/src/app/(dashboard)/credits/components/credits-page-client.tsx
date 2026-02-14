"use client";

import { useEffect, useState } from "react";
import { Coins, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useWorkspace } from "@/lib/hooks/use-workspace";
import { track } from "@/lib/analytics/events";
import { isUnlimitedCredits } from "@/types/credits";
import { TransactionTable } from "./transaction-table";
import { PurchaseDialog } from "./purchase-dialog";

export default function CreditsPageClient() {
  const { workspace } = useWorkspace();
  const [purchaseOpen, setPurchaseOpen] = useState(false);

  useEffect(() => {
    track("credits_page_viewed");
  }, []);

  const balance = workspace?.credit_balance ?? 0;
  const unlimited = isUnlimitedCredits(balance);
  const isLow = !unlimited && balance < 20;

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Credits</h1>
          <p className="text-sm text-muted-foreground">
            Manage your AI feature credits and view transaction history
          </p>
        </div>
        <Button onClick={() => setPurchaseOpen(true)}>
          <Plus className="mr-1.5 size-4" />
          Purchase Credits
        </Button>
      </div>

      {/* Balance Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Coins className="size-5" />
            Available Credits
          </CardTitle>
          <CardDescription>
            Credits are used for AI-powered features like insights, variations,
            and competitor reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-bold">{unlimited ? "∞" : balance}</span>
            <span className="text-sm text-muted-foreground">
              {unlimited ? "Unlimited credits" : "credits"}
            </span>
          </div>
          {isLow && (
            <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
              Your balance is running low. Purchase more credits to continue
              using AI features.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Transaction History */}
      <TransactionTable />

      {/* Purchase Dialog */}
      <PurchaseDialog open={purchaseOpen} onOpenChange={setPurchaseOpen} />
    </div>
  );
}
