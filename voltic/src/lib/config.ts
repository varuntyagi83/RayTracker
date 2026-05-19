/**
 * Server startup environment checks.
 * Import this file in lib/db.ts so it runs on cold start.
 * Throws in production if required secrets are absent.
 */

const REQUIRED_PROD_VARS: string[] = [
  "TOKEN_ENCRYPTION_KEY",
  "DATABASE_URL",
  "CLERK_SECRET_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "META_APP_ID",
  "META_APP_SECRET",
  "SLACK_CLIENT_ID",
  "SLACK_CLIENT_SECRET",
  "OPENAI_API_KEY",
];

// NEXT_PHASE is set to "phase-production-build" during `next build`.
// Env vars for secrets are not injected at build time on Vercel — skip checks then.
const isBuilding = process.env.NEXT_PHASE === "phase-production-build";

if (process.env.NODE_ENV === "production" && !isBuilding) {
  for (const key of REQUIRED_PROD_VARS) {
    if (!process.env[key]) {
      throw new Error(
        `[config] Missing required environment variable in production: ${key}`
      );
    }
  }

  const encKey = process.env.TOKEN_ENCRYPTION_KEY!;
  if (Buffer.from(encKey, "hex").byteLength !== 32) {
    throw new Error(
      "[config] TOKEN_ENCRYPTION_KEY must be exactly 32 bytes (64 hex chars)"
    );
  }
}
