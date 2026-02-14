"use client";

import { useState } from "react";
import {
  Plus,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Trash2,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LLM_MODELS } from "@/types/creative-studio";
import type { StudioConversation, LLMProvider } from "@/types/creative-studio";

interface ConversationSidebarProps {
  conversations: StudioConversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: (provider: LLMProvider, model: string) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}

export function ConversationSidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onRename,
  onDelete,
}: ConversationSidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [selectedModelKey, setSelectedModelKey] = useState(
    `${LLM_MODELS[0].provider}:${LLM_MODELS[0].model}`
  );

  const startRename = (conv: StudioConversation) => {
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const saveRename = () => {
    if (editingId && editTitle.trim()) {
      onRename(editingId, editTitle.trim());
    }
    setEditingId(null);
  };

  return (
    <div className="w-64 border-r flex flex-col bg-muted/30">
      <div className="p-3 border-b space-y-2">
        <Select value={selectedModelKey} onValueChange={setSelectedModelKey}>
          <SelectTrigger className="w-full h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LLM_MODELS.map((m) => (
              <SelectItem
                key={`${m.provider}:${m.model}`}
                value={`${m.provider}:${m.model}`}
              >
                {m.label} ({m.creditCost} cr)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          onClick={() => {
            const found = LLM_MODELS.find(
              (m) => `${m.provider}:${m.model}` === selectedModelKey
            );
            if (found) onNew(found.provider, found.model);
          }}
          className="w-full"
          size="sm"
        >
          <Plus className="size-4 mr-1.5" />
          New Chat
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-0.5">
          {conversations.map((conv) => {
            const isActive = conv.id === activeId;
            const isEditing = conv.id === editingId;

            return (
              <div
                key={conv.id}
                className={`group rounded-lg transition-colors ${
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/50"
                }`}
              >
                {isEditing ? (
                  <div className="flex items-center gap-1 p-2">
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="h-7 text-xs"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveRename();
                        if (e.key === "Escape") setEditingId(null);
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6 shrink-0"
                      onClick={saveRename}
                    >
                      <Check className="size-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6 shrink-0"
                      onClick={() => setEditingId(null)}
                    >
                      <X className="size-3" />
                    </Button>
                  </div>
                ) : (
                  <div
                    className="flex items-center gap-2 p-2 cursor-pointer"
                    onClick={() => onSelect(conv.id)}
                  >
                    <MessageSquare className="size-4 shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{conv.title}</p>
                      {conv.lastMessage && (
                        <p className="text-xs text-muted-foreground truncate">
                          {conv.lastMessage}
                        </p>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="size-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem onClick={() => startRename(conv)}>
                          <Pencil className="size-4" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onDelete(conv.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="size-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </div>
            );
          })}

          {conversations.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="size-8 mx-auto mb-2 opacity-40" />
              <p className="text-xs">No conversations yet</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
