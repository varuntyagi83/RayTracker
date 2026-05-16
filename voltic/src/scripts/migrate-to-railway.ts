/**
 * One-shot migration: Supabase → Railway
 * Pulls data via Supabase REST API (HTTPS, no port 5432 needed)
 * Inserts into Railway Postgres via postgres.js
 *
 * Run: npx tsx src/scripts/migrate-to-railway.ts
 */
import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const RAILWAY_URL = process.env.DATABASE_URL!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const db = postgres(RAILWAY_URL, { max: 5 });

// Tables in dependency order (parents before children)
const TABLES = [
  "workspaces",
  "workspace_members",
  "ad_accounts",
  "campaigns",
  "campaign_metrics",
  "creatives",
  "creative_metrics",
  "automations",
  "automation_runs",
  "boards",
  "saved_ads",
  "assets",
  "variations",
  "generated_ads",
  "credit_transactions",
  "ad_insights",
  "ad_comparisons",
  "competitor_brands",
  "competitor_ads",
  "competitor_reports",
  "facebook_pages",
  "comments",
  "brand_guidelines",
  "studio_conversations",
  "studio_messages",
  "ad_decompositions",
  "mcp_api_keys",
  "downloaded_media",
];

async function fetchAll(table: string): Promise<Record<string, unknown>[]> {
  const PAGE = 1000;
  const rows: Record<string, unknown>[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .range(from, from + PAGE - 1);

    if (error) {
      console.warn(`  ⚠ ${table}: fetch error — ${error.message}`);
      return rows;
    }
    if (!data || data.length === 0) break;

    rows.push(...(data as Record<string, unknown>[]));
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return rows;
}

async function insertBatch(
  table: string,
  rows: Record<string, unknown>[]
): Promise<void> {
  if (rows.length === 0) return;

  const CHUNK = 100;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const cols = Object.keys(chunk[0]);
    const colList = cols.map((c) => `"${c}"`).join(", ");

    const values = chunk.map(
      (row, ri) =>
        `(${cols.map((_, ci) => `$${ri * cols.length + ci + 1}`).join(", ")})`
    );

    const flat = chunk.flatMap((row) => cols.map((c) => row[c] ?? null));

    await db.unsafe(
      `INSERT INTO public."${table}" (${colList}) VALUES ${values.join(", ")} ON CONFLICT DO NOTHING`,
      flat as never[]
    );
  }
}

async function migrateTable(table: string): Promise<void> {
  process.stdout.write(`  ${table}... `);
  const rows = await fetchAll(table);
  if (rows.length === 0) {
    console.log("empty");
    return;
  }
  await insertBatch(table, rows);
  console.log(`${rows.length} rows`);
}

async function main() {
  console.log("Voltic: Supabase → Railway data migration");
  console.log("==========================================");

  for (const table of TABLES) {
    try {
      await migrateTable(table);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`FAILED — ${msg}`);
    }
  }

  console.log("\nMigration complete.");
  await db.end();
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
