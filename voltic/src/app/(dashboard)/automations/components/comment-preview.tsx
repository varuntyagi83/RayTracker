"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MessageSquare, Instagram, Facebook } from "lucide-react";
import {
  COMMENT_FREQUENCY_LABELS,
  POST_TYPE_LABELS,
  POST_AGE_LABELS,
  type CommentWizardState,
} from "@/types/automation";

interface CommentPreviewProps {
  state: CommentWizardState;
}

const MOCK_COMMENTS = [
  {
    page: "Nike Running",
    platform: "facebook" as const,
    commenter: "Sarah J.",
    text: "Love these new shoes! Just ordered a pair",
    postTitle: "Summer Collection Drop",
    time: "2h ago",
  },
  {
    page: "Nike Running",
    platform: "instagram" as const,
    commenter: "Mike R.",
    text: "When will the blue colorway be available?",
    postTitle: "New Air Max 2026",
    time: "4h ago",
  },
  {
    page: "Nike Training",
    platform: "facebook" as const,
    commenter: "Alex P.",
    text: "The sizing runs a bit small. Order a size up!",
    postTitle: "Training Gear Sale",
    time: "6h ago",
  },
];

export function CommentPreview({ state }: CommentPreviewProps) {
  const { name, config } = state;
  const pageCount = config.pages.length;
  const igCount = config.pages.filter((p) => p.hasInstagram).length;

  return (
    <div className="space-y-4">
      <div className="text-xs text-muted-foreground uppercase font-medium tracking-wide">
        Live Preview
      </div>

      <Card className="p-4 bg-muted/30 border-dashed">
        {/* Header */}
        <div className="mb-3">
          <h4 className="font-semibold text-sm">
            {name || "Untitled Comment Digest"}
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            {pageCount > 0
              ? `${pageCount} page${pageCount !== 1 ? "s" : ""}${igCount > 0 ? ` · ${igCount} with Instagram` : ""}`
              : "No pages selected"}{" "}
            · {COMMENT_FREQUENCY_LABELS[config.frequency]}
          </p>
        </div>

        {/* Filter badges */}
        <div className="flex gap-1.5 mb-3 flex-wrap">
          <Badge variant="secondary" className="text-xs bg-violet-100 text-violet-700">
            {POST_TYPE_LABELS[config.postFilters.postType]}
          </Badge>
          <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700">
            {POST_AGE_LABELS[config.postFilters.postAge]}
          </Badge>
        </div>

        {/* Mock comments */}
        <div className="border rounded-md overflow-hidden">
          {MOCK_COMMENTS.map((comment, i) => (
            <div
              key={i}
              className={`flex items-start gap-3 px-3 py-2.5 text-xs ${
                i > 0 ? "border-t" : ""
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium">{comment.commenter}</span>
                  <span className="text-muted-foreground">on</span>
                  <span className="font-medium truncate">
                    {comment.postTitle}
                  </span>
                </div>
                <p className="text-muted-foreground mt-0.5 line-clamp-1">
                  {comment.text}
                </p>
                <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                  {comment.platform === "instagram" ? (
                    <Instagram className="h-3 w-3" />
                  ) : (
                    <Facebook className="h-3 w-3" />
                  )}
                  <span>{comment.page}</span>
                  <span>·</span>
                  <span>{comment.time}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-3 text-[10px] text-muted-foreground/60 text-center">
          Preview with sample data
        </p>
      </Card>
    </div>
  );
}
