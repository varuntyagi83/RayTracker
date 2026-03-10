"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Key,
  Plus,
  Trash2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  listMcpApiKeysAction,
  createMcpApiKeyAction,
  deleteMcpApiKeyAction,
  toggleMcpApiKeyAction,
  type McpApiKey,
} from "../actions";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const date = new Date(dateStr);
  const now = Date.now();
  const diff = now - date.getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString();
}

const SCOPE_COLORS: Record<string, string> = {
  read: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  write: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  ai: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

function ScopeBadge({ scope }: { scope: string }) {
  const colorClass =
    SCOPE_COLORS[scope.toLowerCase()] ??
    "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${colorClass}`}
    >
      {scope}
    </span>
  );
}

// ─── Quick-Start Config Panel ────────────────────────────────────────────────

const CONFIG_SNIPPET = `{
  "mcpServers": {
    "voltic": {
      "url": "https://your-domain.com/api/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_KEY_HERE"
      }
    }
  }
}`;

function QuickStartPanel() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(CONFIG_SNIPPET);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors rounded-lg"
      >
        <span className="flex items-center gap-2">
          <Key className="size-4 text-muted-foreground" />
          Connect to Claude Desktop / Claude Code
        </span>
        {open ? (
          <ChevronUp className="size-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="size-4 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="border-t px-4 pb-4 pt-3 space-y-3">
          <p className="text-xs text-muted-foreground">
            Add this to your Claude Desktop or Claude Code MCP configuration:
          </p>
          <div className="relative">
            <pre className="rounded-md bg-muted px-4 py-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap">
              {CONFIG_SNIPPET}
            </pre>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 size-7"
              onClick={handleCopy}
              title="Copy config"
            >
              {copied ? (
                <Check className="size-3.5 text-emerald-600" />
              ) : (
                <Copy className="size-3.5" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Replace <code className="rounded bg-muted px-1 py-0.5 text-[11px]">your-domain.com</code>{" "}
            with your Voltic deployment URL and <code className="rounded bg-muted px-1 py-0.5 text-[11px]">YOUR_KEY_HERE</code>{" "}
            with a key created above.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Create Key Dialog ────────────────────────────────────────────────────────

interface CreatedKey {
  id: string;
  rawKey: string;
  name: string;
  scopes: string[];
  createdAt: string;
}

interface CreateKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (key: McpApiKey) => void;
}

function CreateKeyDialog({ open, onOpenChange, onCreated }: CreateKeyDialogProps) {
  const [step, setStep] = useState<"form" | "reveal">("form");
  const [name, setName] = useState("");
  const [scopeRead, setScopeRead] = useState(true);
  const [scopeWrite, setScopeWrite] = useState(false);
  const [scopeAi, setScopeAi] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createdKey, setCreatedKey] = useState<CreatedKey | null>(null);
  const [keyCopied, setKeyCopied] = useState(false);

  const reset = () => {
    setStep("form");
    setName("");
    setScopeRead(true);
    setScopeWrite(false);
    setScopeAi(false);
    setSubmitting(false);
    setCreatedKey(null);
    setKeyCopied(false);
  };

  const handleOpenChange = (val: boolean) => {
    if (!val) reset();
    onOpenChange(val);
  };

  const handleSubmit = async () => {
    const scopes: string[] = [];
    if (scopeRead) scopes.push("read");
    if (scopeWrite) scopes.push("write");
    if (scopeAi) scopes.push("ai");

    if (!name.trim()) {
      toast.error("Please enter a name for the key");
      return;
    }
    if (scopes.length === 0) {
      toast.error("Please select at least one scope");
      return;
    }

    setSubmitting(true);
    const result = await createMcpApiKeyAction({ name: name.trim(), scopes });
    setSubmitting(false);

    if (result.error || !result.data) {
      toast.error(result.error ?? "Failed to create API key");
      return;
    }

    setCreatedKey(result.data);
    setStep("reveal");

    // Notify parent with the sanitized key record
    onCreated({
      id: result.data.id,
      name: result.data.name,
      scopes: result.data.scopes,
      lastUsedAt: null,
      expiresAt: null,
      isActive: true,
      createdAt: result.data.createdAt,
    });
  };

  const handleCopyKey = async () => {
    if (!createdKey) return;
    await navigator.clipboard.writeText(createdKey.rawKey);
    setKeyCopied(true);
    toast.success("API key copied to clipboard");
    setTimeout(() => setKeyCopied(false), 2000);
  };

  const handleDone = () => {
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        {step === "form" ? (
          <>
            <DialogHeader>
              <DialogTitle>Create API Key</DialogTitle>
              <DialogDescription>
                Generate a new key to connect an AI agent or tool to Voltic.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="key-name">Name</Label>
                <Input
                  id="key-name"
                  placeholder="e.g. Claude Cowork"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSubmit();
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label>Scopes</Label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      id="scope-read"
                      checked={scopeRead}
                      onCheckedChange={(checked) => setScopeRead(!!checked)}
                    />
                    <div>
                      <span className="text-sm font-medium">Read</span>
                      <p className="text-xs text-muted-foreground">
                        Access workspace data, campaigns, and insights
                      </p>
                    </div>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      id="scope-write"
                      checked={scopeWrite}
                      onCheckedChange={(checked) => setScopeWrite(!!checked)}
                    />
                    <div>
                      <span className="text-sm font-medium">Write</span>
                      <p className="text-xs text-muted-foreground">
                        Create and modify boards, assets, and automations
                      </p>
                    </div>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      id="scope-ai"
                      checked={scopeAi}
                      onCheckedChange={(checked) => setScopeAi(!!checked)}
                    />
                    <div>
                      <span className="text-sm font-medium">AI</span>
                      <p className="text-xs text-muted-foreground">
                        Trigger AI generation and consume credits
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-1.5 size-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Key"
                )}
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Your API Key</DialogTitle>
              <DialogDescription>
                Copy this key now. It will not be shown again.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="rounded-md border bg-muted p-3">
                <code className="break-all text-sm font-mono select-all">
                  {createdKey?.rawKey}
                </code>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={handleCopyKey}
              >
                {keyCopied ? (
                  <>
                    <Check className="mr-1.5 size-4 text-emerald-600" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="mr-1.5 size-4" />
                    Copy API Key
                  </>
                )}
              </Button>

              <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-400">
                <AlertTriangle className="size-3.5 shrink-0 mt-0.5" />
                <span>
                  This key will not be shown again. Store it securely before closing this dialog.
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={handleDone}>Done</Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function McpKeysCard() {
  const [keys, setKeys] = useState<McpApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const loadKeys = useCallback(async () => {
    setLoading(true);
    const result = await listMcpApiKeysAction();
    if (result.data) setKeys(result.data);
    else toast.error(result.error ?? "Failed to load API keys");
    setLoading(false);
  }, []);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  const handleCreated = (key: McpApiKey) => {
    setKeys((prev) => [key, ...prev]);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await deleteMcpApiKeyAction({ keyId: deleteTarget });
    setDeleting(false);
    setDeleteTarget(null);
    if (result.success) {
      setKeys((prev) => prev.filter((k) => k.id !== deleteTarget));
      toast.success("API key deleted");
    } else {
      toast.error(result.error ?? "Failed to delete key");
    }
  };

  const handleToggle = async (key: McpApiKey) => {
    setTogglingId(key.id);
    const newActive = !key.isActive;
    const result = await toggleMcpApiKeyAction({ keyId: key.id, isActive: newActive });
    setTogglingId(null);
    if (result.success) {
      setKeys((prev) =>
        prev.map((k) => (k.id === key.id ? { ...k, isActive: newActive } : k))
      );
      toast.success(newActive ? "Key activated" : "Key deactivated");
    } else {
      toast.error(result.error ?? "Failed to update key");
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Key className="size-5" />
                MCP API Keys
              </CardTitle>
              <CardDescription className="mt-1">
                Connect Claude, n8n, and other AI agents to Voltic via the Model Context Protocol.
              </CardDescription>
            </div>
            <Button
              className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white"
              size="sm"
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="mr-1.5 size-4" />
              Create API Key
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" />
              <span className="text-sm">Loading keys...</span>
            </div>
          ) : keys.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-10 text-center">
              <Key className="size-8 text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No API keys yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Create one to connect AI agents to Voltic.
              </p>
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">Name</TableHead>
                    <TableHead>Scopes</TableHead>
                    <TableHead className="w-[120px]">Last Used</TableHead>
                    <TableHead className="w-[120px]">Created</TableHead>
                    <TableHead className="w-[90px]">Status</TableHead>
                    <TableHead className="w-[90px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {keys.map((key) => (
                    <TableRow key={key.id}>
                      <TableCell className="font-medium text-sm">{key.name}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {key.scopes.map((scope) => (
                            <ScopeBadge key={scope} scope={scope} />
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {relativeTime(key.lastUsedAt)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {relativeTime(key.createdAt)}
                      </TableCell>
                      <TableCell>
                        {key.isActive ? (
                          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 text-xs">
                            Active
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-red-600 border-red-200 text-xs dark:text-red-400 dark:border-red-800"
                          >
                            Inactive
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            title={key.isActive ? "Deactivate key" : "Activate key"}
                            disabled={togglingId === key.id}
                            onClick={() => handleToggle(key)}
                          >
                            {togglingId === key.id ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : key.isActive ? (
                              <ToggleRight className="size-4 text-emerald-600" />
                            ) : (
                              <ToggleLeft className="size-4 text-muted-foreground" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-destructive hover:text-destructive"
                            title="Delete key"
                            onClick={() => setDeleteTarget(key.id)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <QuickStartPanel />
        </CardContent>
      </Card>

      <CreateKeyDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={handleCreated}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete API Key?</AlertDialogTitle>
            <AlertDialogDescription>
              This key will be permanently deleted and any agents using it will lose access.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-1.5 size-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Key"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
