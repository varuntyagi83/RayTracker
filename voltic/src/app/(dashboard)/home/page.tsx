import { getWorkspace } from "@/lib/supabase/queries";
import { redirect } from "next/navigation";
import { LogoutButton } from "./logout-button";

export default async function HomePage() {
  const workspace = await getWorkspace();
  if (!workspace) redirect("/login");

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">Workspace Overview</h1>
      <p className="mt-2 text-muted-foreground">
        Welcome to <strong>{workspace.name}</strong>
      </p>
      <div className="mt-6">
        <LogoutButton />
      </div>
    </div>
  );
}
