import { createClient } from "@supabase/supabase-js";

// Admin client that bypasses RLS — use only in server actions/API routes
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Ensure the "brand-assets" storage bucket exists (idempotent, called once per cold start)
let bucketEnsured = false;

export async function ensureStorageBucket() {
  if (bucketEnsured) return;
  const supabase = createAdminClient();
  await supabase.storage.createBucket("brand-assets", {
    public: true,
    fileSizeLimit: 52428800, // 50MB
  });
  // createBucket returns error if already exists — that's fine
  bucketEnsured = true;
}
