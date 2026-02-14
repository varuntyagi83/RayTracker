"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWorkspace } from "@/lib/hooks/use-workspace";
import { track } from "@/lib/analytics/events";
import { isUnlimitedCredits } from "@/types/credits";
import { PurchaseDialog } from "@/app/(dashboard)/credits/components/purchase-dialog";

export function CreditBalance() {
  const { workspace } = useWorkspace();
  const router = useRouter();
  const [purchaseOpen, setPurchaseOpen] = useState(false);

  const balance = workspace?.credit_balance ?? 0;
  const unlimited = isUnlimitedCredits(balance);
  const isLow = !unlimited && balance < 20;
  const isVeryLow = !unlimited && balance < 5;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={() => track("credit_balance_clicked")}
          >
            <Coins className="size-4" />
            <span className="font-medium">{unlimited ? "∞" : balance}</span>
            {isVeryLow ? (
              <Badge variant="destructive" className="ml-1 px-1.5 py-0 text-[10px]">
                Low
              </Badge>
            ) : isLow ? (
              <Badge variant="secondary" className="ml-1 border-amber-500 bg-amber-50 px-1.5 py-0 text-[10px] text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                Low
              </Badge>
            ) : null}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="px-3 py-2">
            <p className="text-xs text-muted-foreground">Available Credits</p>
            <p className="text-2xl font-bold">{unlimited ? "∞ Unlimited" : balance}</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push("/credits")}>
            View Transaction History
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setPurchaseOpen(true)}>
            Purchase Credits
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <PurchaseDialog open={purchaseOpen} onOpenChange={setPurchaseOpen} />
    </>
  );
}
