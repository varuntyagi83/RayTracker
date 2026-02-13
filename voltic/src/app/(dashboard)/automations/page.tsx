import { redirect } from "next/navigation";
import { getWorkspace } from "@/lib/supabase/queries";
import { getAutomations } from "@/lib/data/automations";
import { AutomationsListClient } from "./components/automations-list-client";

export default async function AutomationsPage() {
  const workspace = await getWorkspace();
  if (!workspace) redirect("/signup");

  const automations = await getAutomations(workspace.id);

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Automations</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Schedule performance reports, competitor monitoring, and comment
          digests.
        </p>
      </div>
      <AutomationsListClient automations={automations} />
    </div>
  );
}
