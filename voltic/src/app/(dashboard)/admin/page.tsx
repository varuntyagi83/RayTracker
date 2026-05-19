import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { isSuperAdmin } from "@/lib/admin";
import AdminClient from "./components/admin-client";

export default async function AdminPage() {
  const { userId } = await auth();
  if (!userId || !isSuperAdmin(userId)) {
    redirect("/home");
  }

  return <AdminClient />;
}
