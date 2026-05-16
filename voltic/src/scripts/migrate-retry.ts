/**
 * Retry migration for tables that failed due to FK ordering.
 * brand_guidelines is already in Railway — now insert assets, variations, generated_ads.
 *
 * Run: npx tsx src/scripts/migrate-retry.ts
 */
import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const RAILWAY_URL = process.env.DATABASE_URL!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const db = postgres(RAILWAY_URL, { max: 5 });

const TABLES = ["assets", "variations", "generated_ads"];

async function fetchAll(table: string): Promise<Record<string, unknown>[]> {
  const PAGE = 1000;
  const rows: Record<string, unknown>[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .range(from, from + PAGE - 1);
    if (error) { console.warn(`  ⚠ ${table}: ${error.message}`); return rows; }
    if (!data || data.length === 0) break;
    rows.push(...(data as Record<string, unknown>[]));
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return rows;
}

async function insertBatch(table: string, rows: Record<string, unknown>[]): Promise<void> {
  if (rows.length === 0) return;
  const CHUNK = 100;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const cols = Object.keys(chunk[0]);
    const colList = cols.map((c) => `"${c}"`).join(", ");
    const values = chunk.map((_, ri) => `(${cols.map((_, ci) => `$${ri * cols.length + ci + 1}`).join(", ")})`);
    const flat = chunk.flatMap((row) => cols.map((c) => row[c] ?? null));
    await db.unsafe(
      `INSERT INTO public."${table}" (${colList}) VALUES ${values.join(", ")} ON CONFLICT DO NOTHING`,
      flat as never[]
    );
  }
}

async function main() {
  console.log("Retrying failed tables: assets, variations, generated_ads");
  for (const table of TABLES) {
    process.stdout.write(`  ${table}... `);
    try {
      const rows = await fetchAll(table);
      if (rows.length === 0) { console.log("empty"); continue; }
      await insertBatch(table, rows);
      console.log(`${rows.length} rows`);
    } catch (err) {
      console.log(`FAILED — ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  console.log("Done.");
  await db.end();
}

main().catch(console.error);
