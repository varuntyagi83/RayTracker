"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { saveStudioOutputAsAssetAction } from "../actions";

interface SaveAsAssetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: string;
}

export function SaveAsAssetDialog({
  open,
  onOpenChange,
  content,
}: SaveAsAssetDialogProps) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    setSaving(true);
    setError(null);

    const result = await saveStudioOutputAsAssetAction({
      name: name.trim(),
      description: content.slice(0, 500),
    });

    setSaving(false);

    if (result.success) {
      setSaved(true);
      setTimeout(() => {
        onOpenChange(false);
        setSaved(false);
        setName("");
      }, 1500);
    } else {
      setError(result.error ?? "Failed to save");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save as Asset</DialogTitle>
          <DialogDescription>
            Save this AI-generated creative as a new asset in your catalog.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Asset Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sunday Q1 Ad Copy"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Preview</label>
            <Textarea
              value={content.slice(0, 500)}
              readOnly
              rows={4}
              className="text-xs text-muted-foreground"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {saved && (
            <p className="text-sm text-emerald-600">Asset saved successfully!</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || saved}>
            {saving ? (
              <>
                <Loader2 className="size-4 mr-1 animate-spin" />
                Saving...
              </>
            ) : saved ? (
              "Saved!"
            ) : (
              "Save Asset"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
