"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  ChevronDown,
  ChevronRight,
  Users,
  CreditCard,
  Loader2,
  Plus,
  Trash2,
  Shield,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface WorkspaceRow {
  id: string;
  name: string;
  slug: string;
  creditBalance: number;
  metaConnected: boolean;
  slackConnected: boolean;
  slackTeamName: string | null;
  createdAt: string;
  memberCount: number;
}

interface MemberRow {
  id: string;
  userId: string;
  role: string;
  createdAt: string;
  name: string;
  email: string;
}

// ─── Inline Credit Editor ─────────────────────────────────────────────────────

function CreditEditor({
  workspaceId,
  initial,
  onSaved,
}: {
  workspaceId: string;
  initial: number;
  onSaved: (next: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(initial));
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  async function save() {
    const n = parseInt(value, 10);
    if (isNaN(n) || n < 0) { toast.error("Enter a valid number"); return; }
    setSaving(true);
    const res = await fetch(`/api/admin/workspaces/${workspaceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creditBalance: n }),
    });
    setSaving(false);
    if (!res.ok) { toast.error("Failed to update credits"); return; }
    onSaved(n);
    setEditing(false);
    toast.success("Credits updated");
  }

  function cancel() {
    setValue(String(initial));
    setEditing(false);
  }

  if (!editing) {
    return (
      <button
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground group"
        onClick={(e) => { e.stopPropagation(); setEditing(true); }}
        title="Edit credits"
      >
        <CreditCard className="h-3.5 w-3.5" />
        <span>{initial.toLocaleString()}</span>
        <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      <Input
        ref={inputRef}
        type="number"
        min={0}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }}
        className="h-6 w-24 text-xs px-1.5"
      />
      {saving ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
      ) : (
        <>
          <button onClick={save} className="text-emerald-600 hover:text-emerald-700">
            <Check className="h-3.5 w-3.5" />
          </button>
          <button onClick={cancel} className="text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        </>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminClient() {
  const [workspaces, setWorkspaces] = useState<WorkspaceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [members, setMembers] = useState<Record<string, MemberRow[]>>({});
  const [membersLoading, setMembersLoading] = useState<Record<string, boolean>>({});

  // Add member dialog
  const [addDialogWorkspaceId, setAddDialogWorkspaceId] = useState<string | null>(null);
  const [addUserId, setAddUserId] = useState("");
  const [addRole, setAddRole] = useState<"owner" | "admin" | "member">("member");
  const [addLoading, setAddLoading] = useState(false);

  // Delete workspace dialog
  const [deleteWorkspace, setDeleteWorkspace] = useState<WorkspaceRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");

  const fetchWorkspaces = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/workspaces");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setWorkspaces(data.workspaces);
    } catch {
      toast.error("Could not load workspaces");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchWorkspaces(); }, [fetchWorkspaces]);

  const fetchMembers = useCallback(async (workspaceId: string) => {
    if (members[workspaceId]) return;
    setMembersLoading((p) => ({ ...p, [workspaceId]: true }));
    try {
      const res = await fetch(`/api/admin/workspaces/${workspaceId}/members`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMembers((p) => ({ ...p, [workspaceId]: data.members }));
    } catch {
      toast.error("Could not load members");
    } finally {
      setMembersLoading((p) => ({ ...p, [workspaceId]: false }));
    }
  }, [members]);

  const toggleWorkspace = useCallback((workspaceId: string) => {
    if (expandedId === workspaceId) { setExpandedId(null); return; }
    setExpandedId(workspaceId);
    fetchMembers(workspaceId);
  }, [expandedId, fetchMembers]);

  const changeRole = useCallback(async (workspaceId: string, memberId: string, role: string) => {
    const res = await fetch(`/api/admin/workspaces/${workspaceId}/members/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (!res.ok) { toast.error("Failed to update role"); return; }
    setMembers((p) => ({
      ...p,
      [workspaceId]: p[workspaceId].map((m) => m.userId === memberId ? { ...m, role } : m),
    }));
    toast.success("Role updated");
  }, []);

  const removeMember = useCallback(async (workspaceId: string, memberId: string) => {
    const res = await fetch(`/api/admin/workspaces/${workspaceId}/members/${memberId}`, {
      method: "DELETE",
    });
    if (!res.ok) { toast.error("Failed to remove member"); return; }
    setMembers((p) => ({ ...p, [workspaceId]: p[workspaceId].filter((m) => m.userId !== memberId) }));
    setWorkspaces((p) => p.map((w) => w.id === workspaceId ? { ...w, memberCount: w.memberCount - 1 } : w));
    toast.success("Member removed");
  }, []);

  const addMember = useCallback(async () => {
    if (!addDialogWorkspaceId || !addUserId.trim()) return;
    setAddLoading(true);
    try {
      const res = await fetch(`/api/admin/workspaces/${addDialogWorkspaceId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: addUserId.trim(), role: addRole }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to add member"); return; }
      setMembers((p) => ({
        ...p,
        [addDialogWorkspaceId]: [...(p[addDialogWorkspaceId] ?? []), {
          id: data.id, userId: addUserId.trim(), role: addRole, createdAt: new Date().toISOString(), name: "", email: "",
        }],
      }));
      setWorkspaces((p) => p.map((w) => w.id === addDialogWorkspaceId ? { ...w, memberCount: w.memberCount + 1 } : w));
      setAddDialogWorkspaceId(null);
      setAddUserId("");
      setAddRole("member");
      toast.success("Member added");
    } finally {
      setAddLoading(false);
    }
  }, [addDialogWorkspaceId, addUserId, addRole]);

  const confirmDeleteWorkspace = useCallback(async () => {
    if (!deleteWorkspace) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/admin/workspaces/${deleteWorkspace.id}`, { method: "DELETE" });
      if (!res.ok) { toast.error("Failed to delete workspace"); return; }
      setWorkspaces((p) => p.filter((w) => w.id !== deleteWorkspace.id));
      if (expandedId === deleteWorkspace.id) setExpandedId(null);
      setDeleteWorkspace(null);
      setDeleteConfirmName("");
      toast.success(`Workspace "${deleteWorkspace.name}" deleted`);
    } finally {
      setDeleteLoading(false);
    }
  }, [deleteWorkspace, expandedId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-orange-500" />
        <div>
          <h1 className="text-xl font-semibold">Admin Panel</h1>
          <p className="text-sm text-muted-foreground">
            {workspaces.length} workspace{workspaces.length !== 1 ? "s" : ""} in the platform
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {workspaces.map((ws) => (
          <Card key={ws.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div
                className="flex items-center justify-between cursor-pointer select-none"
                onClick={() => toggleWorkspace(ws.id)}
              >
                <div className="flex items-center gap-3">
                  {expandedId === ws.id
                    ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  <div>
                    <CardTitle className="text-base">{ws.name}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">/{ws.slug}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    <span>{ws.memberCount}</span>
                  </div>

                  <CreditEditor
                    workspaceId={ws.id}
                    initial={ws.creditBalance}
                    onSaved={(n) =>
                      setWorkspaces((p) => p.map((w) => w.id === ws.id ? { ...w, creditBalance: n } : w))
                    }
                  />

                  <div className="flex items-center gap-1.5">
                    {ws.metaConnected
                      ? <Badge variant="secondary" className="text-xs bg-blue-50 text-blue-700 border-blue-200">Meta</Badge>
                      : <Badge variant="outline" className="text-xs text-muted-foreground">No Meta</Badge>}
                    {ws.slackConnected
                      ? <Badge variant="secondary" className="text-xs bg-green-50 text-green-700 border-green-200">Slack</Badge>
                      : <Badge variant="outline" className="text-xs text-muted-foreground">No Slack</Badge>}
                  </div>

                  <button
                    className="text-muted-foreground hover:text-destructive transition-colors p-1"
                    title="Delete workspace"
                    onClick={(e) => { e.stopPropagation(); setDeleteWorkspace(ws); setDeleteConfirmName(""); }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </CardHeader>

            {expandedId === ws.id && (
              <CardContent className="pt-0 border-t">
                <div className="pt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">Members</h3>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1.5"
                      onClick={() => setAddDialogWorkspaceId(ws.id)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add member
                    </Button>
                  </div>

                  {membersLoading[ws.id] ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : !members[ws.id] || members[ws.id].length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">No members yet</p>
                  ) : (
                    <div className="space-y-2">
                      {members[ws.id].map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/40"
                        >
                          <div>
                            <p className="text-sm font-medium">
                              {member.name || member.email || member.userId}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {member.email && member.name ? `${member.email} · ` : ""}
                              Added {new Date(member.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Select
                              value={member.role}
                              onValueChange={(role) => changeRole(ws.id, member.userId, role)}
                            >
                              <SelectTrigger className="h-7 w-28 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="owner">Owner</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="member">Member</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                              onClick={() => removeMember(ws.id, member.userId)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* Add Member Dialog */}
      <Dialog
        open={!!addDialogWorkspaceId}
        onOpenChange={(open) => { if (!open) { setAddDialogWorkspaceId(null); setAddUserId(""); setAddRole("member"); } }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="clerk-user-id">Clerk User ID</Label>
              <Input
                id="clerk-user-id"
                placeholder="user_xxxxxxxxxxxxxxxx"
                value={addUserId}
                onChange={(e) => setAddUserId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Find this in the Clerk Dashboard under Users.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="role">Role</Label>
              <Select value={addRole} onValueChange={(v) => setAddRole(v as typeof addRole)}>
                <SelectTrigger id="role"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">Owner</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogWorkspaceId(null)}>Cancel</Button>
            <Button onClick={addMember} disabled={addLoading || !addUserId.trim()}>
              {addLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Add member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Workspace Dialog */}
      <Dialog
        open={!!deleteWorkspace}
        onOpenChange={(open) => { if (!open) { setDeleteWorkspace(null); setDeleteConfirmName(""); } }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete workspace</DialogTitle>
            <DialogDescription>
              This permanently deletes <strong>{deleteWorkspace?.name}</strong> and all its data: ad
              accounts, campaigns, automations, boards, assets, and members. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label htmlFor="confirm-name">
              Type <strong>{deleteWorkspace?.name}</strong> to confirm
            </Label>
            <Input
              id="confirm-name"
              value={deleteConfirmName}
              onChange={(e) => setDeleteConfirmName(e.target.value)}
              placeholder={deleteWorkspace?.name}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteWorkspace(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={deleteLoading || deleteConfirmName !== deleteWorkspace?.name}
              onClick={confirmDeleteWorkspace}
            >
              {deleteLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Delete workspace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
