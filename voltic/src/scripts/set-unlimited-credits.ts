/**
 * Set unlimited credits for a user by email.
 * Run: npx tsx src/scripts/set-unlimited-credits.ts
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../../.env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const UNLIMITED_BALANCE = 999_999;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const TARGET_EMAIL = process.argv[2] || "varun.tyagi83@gmail.com";

async function main() {
  // 1. Find user by email
  const { data: users, error: userErr } = await supabase.auth.admin.listUsers();

  if (userErr) {
    console.error("Failed to list users:", userErr.message);
    process.exit(1);
  }

  const user = users.users.find((u) => u.email === TARGET_EMAIL);
  if (!user) {
    console.error(`User not found: ${TARGET_EMAIL}`);
    process.exit(1);
  }

  console.log(`Found user: ${user.email} (${user.id})`);

  // 2. Find workspace
  const { data: member, error: memberErr } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .single();

  if (memberErr || !member) {
    console.error("No workspace found for user");
    process.exit(1);
  }

  console.log(`Workspace: ${member.workspace_id}`);

  // 3. Set unlimited credits
  const { error: updateErr } = await supabase
    .from("workspaces")
    .update({ credit_balance: UNLIMITED_BALANCE })
    .eq("id", member.workspace_id);

  if (updateErr) {
    console.error("Failed to update credits:", updateErr.message);
    process.exit(1);
  }

  console.log(`Set ${TARGET_EMAIL} to unlimited credits (${UNLIMITED_BALANCE})`);
}

main();
