"use client";

import Image from "next/image";
import { Zap } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { track } from "@/lib/analytics/events";
import type {
  TopCreative,
  TopHeadline,
  TopCopy,
  TopLandingPage,
} from "@/lib/data/dashboard";

interface TopAssetsProps {
  creatives: TopCreative[];
  headlines: TopHeadline[];
  copy: TopCopy[];
  landingPages: TopLandingPage[];
  currency?: string;
}

function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function TopAssets({
  creatives,
  headlines,
  copy,
  landingPages,
  currency = "USD",
}: TopAssetsProps) {
  function handleTabChange(tab: string) {
    track("top_assets_tab_switched", { tab });
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Zap className="size-5 text-amber-500" />
        <h2 className="text-lg font-semibold">Top Performing Assets</h2>
      </div>

      <Tabs defaultValue="creatives" onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="creatives">Creatives</TabsTrigger>
          <TabsTrigger value="headlines">Headlines</TabsTrigger>
          <TabsTrigger value="copy">Copy</TabsTrigger>
          <TabsTrigger value="landing-pages">Landing Pages</TabsTrigger>
        </TabsList>

        <TabsContent value="creatives" className="mt-4">
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-4 pb-4">
              {creatives.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No creative data yet.
                </p>
              )}
              {creatives.map((c) => (
                <Card key={c.id} className="w-[220px] shrink-0">
                  <CardContent className="p-0">
                    <div className="relative h-32 w-full overflow-hidden rounded-t-lg bg-muted">
                      {c.imageUrl ? (                        <Image src={c.imageUrl || "/placeholder.svg"} alt={c.name} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" unoptimized />
                      ) : (
                        <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                          No image
                        </div>
                      )}
                      <Badge
                        variant="secondary"
                        className="absolute left-2 top-2 text-[10px]"
                      >
                        {c.format.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="space-y-2 p-3">
                      <p className="truncate text-sm font-medium">{c.name}</p>
                      <div className="grid grid-cols-3 gap-1 text-center">
                        <div>
                          <p className="text-[10px] text-muted-foreground">
                            ROAS
                          </p>
                          <p className="text-xs font-semibold">
                            {c.roas.toFixed(2)}x
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">
                            SPEND
                          </p>
                          <p className="text-xs font-semibold">
                            {formatCurrency(c.spend, currency)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">
                            IMPR
                          </p>
                          <p className="text-xs font-semibold">
                            {formatNumber(c.impressions)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </TabsContent>

        <TabsContent value="headlines" className="mt-4">
          <div className="space-y-2">
            {headlines.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No headline data yet.
              </p>
            )}
            {headlines.map((h, i) => (
              <Card key={i}>
                <CardContent className="flex items-center justify-between p-4">
                  <p className="max-w-md truncate text-sm font-medium">
                    {h.headline}
                  </p>
                  <div className="flex items-center gap-6 text-center">
                    <div>
                      <p className="text-[10px] text-muted-foreground">ROAS</p>
                      <p className="text-sm font-semibold">
                        {h.roas.toFixed(2)}x
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">SPEND</p>
                      <p className="text-sm font-semibold">
                        {formatCurrency(h.spend, currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">IMPR</p>
                      <p className="text-sm font-semibold">
                        {formatNumber(h.impressions)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="copy" className="mt-4">
          <div className="space-y-2">
            {copy.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No copy data yet.
              </p>
            )}
            {copy.map((c, i) => (
              <Card key={i}>
                <CardContent className="flex items-center justify-between p-4">
                  <p className="max-w-md truncate text-sm font-medium">
                    {c.body}
                  </p>
                  <div className="flex items-center gap-6 text-center">
                    <div>
                      <p className="text-[10px] text-muted-foreground">ROAS</p>
                      <p className="text-sm font-semibold">
                        {c.roas.toFixed(2)}x
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">SPEND</p>
                      <p className="text-sm font-semibold">
                        {formatCurrency(c.spend, currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">IMPR</p>
                      <p className="text-sm font-semibold">
                        {formatNumber(c.impressions)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="landing-pages" className="mt-4">
          <div className="space-y-2">
            {landingPages.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No landing page data yet.
              </p>
            )}
            {landingPages.map((lp, i) => (
              <Card key={i}>
                <CardContent className="flex items-center justify-between p-4">
                  <p className="max-w-md truncate text-sm font-medium text-blue-600">
                    {lp.landingPageUrl}
                  </p>
                  <div className="flex items-center gap-6 text-center">
                    <div>
                      <p className="text-[10px] text-muted-foreground">ROAS</p>
                      <p className="text-sm font-semibold">
                        {lp.roas.toFixed(2)}x
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">SPEND</p>
                      <p className="text-sm font-semibold">
                        {formatCurrency(lp.spend, currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">IMPR</p>
                      <p className="text-sm font-semibold">
                        {formatNumber(lp.impressions)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">CTR</p>
                      <p className="text-sm font-semibold">
                        {lp.ctr.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
