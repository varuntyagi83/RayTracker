import { test, expect } from "@playwright/test";

/**
 * Ad Generator E2E Tests
 *
 * Tests the new /ad-generator page:
 * - Unauthenticated redirect
 * - API route health (no 500s)
 * - Page load & UI structure (authenticated, skipped without credentials)
 */

test.describe("Ad Generator", () => {
  // ── Unauthenticated ────────────────────────────────────────────────────────

  test.describe("Unauthenticated Access", () => {
    test("redirects /ad-generator to login", async ({ page }) => {
      await page.goto("/ad-generator");
      await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    });
  });

  // ── API Route Health ───────────────────────────────────────────────────────

  test.describe("API Route Health", () => {
    test("POST /api/ads/composite returns 401 without auth", async ({ request }) => {
      const response = await request.post("/api/ads/composite", {
        data: {
          backgroundImageUrl: "https://example.com/bg.png",
          text: "Test",
          fontFamily: "Inter",
          fontSize: 48,
          textColor: "#FFFFFF",
          textPosition: { type: "center" },
        },
      });
      expect(response.status()).toBeLessThan(500);
      expect([400, 401, 403]).toContain(response.status());
    });

    test("POST /api/ads/composite-batch returns 401 without auth", async ({ request }) => {
      const response = await request.post("/api/ads/composite-batch", {
        data: { combinations: [] },
      });
      expect(response.status()).toBeLessThan(500);
      expect([400, 401, 403]).toContain(response.status());
    });

    test("POST /api/assets/generate-background returns 401 without auth", async ({ request }) => {
      const response = await request.post("/api/assets/generate-background", {
        data: { prompt: "Studio white background" },
      });
      expect(response.status()).toBeLessThan(500);
      expect([400, 401, 403]).toContain(response.status());
    });

    test("GET /api/ads/:id/download returns 401 without auth", async ({ request }) => {
      const response = await request.get("/api/ads/00000000-0000-0000-0000-000000000000/download");
      expect(response.status()).toBeLessThan(500);
    });
  });

  // ── Page Response ──────────────────────────────────────────────────────────

  test.describe("Page Response", () => {
    test("/ad-generator does not return 500", async ({ page }) => {
      const response = await page.goto("/ad-generator");
      expect(response?.status()).toBeLessThan(500);
    });
  });

  // ── Authenticated UI ───────────────────────────────────────────────────────

  test.describe("Authenticated Ad Generator Page", () => {
    test.skip(
      !process.env.TEST_USER_EMAIL,
      "Skipped: TEST_USER_EMAIL not set"
    );

    test.beforeEach(async ({ page }) => {
      await page.goto("/login");
      await page.locator("#email").fill(process.env.TEST_USER_EMAIL!);
      await page.locator("#password").fill(process.env.TEST_USER_PASSWORD!);
      await page.getByRole("button", { name: /sign in/i }).click();
      await page.waitForURL(/\/home/, { timeout: 15_000 });
    });

    test("page loads with Ad Generator heading", async ({ page }) => {
      await page.goto("/ad-generator");
      await page.waitForLoadState("networkidle");
      await expect(
        page.getByRole("heading", { name: /ad generator/i })
      ).toBeVisible({ timeout: 10_000 });
    });

    test("page shows description text", async ({ page }) => {
      await page.goto("/ad-generator");
      await page.waitForLoadState("networkidle");
      await expect(
        page.getByText(/compose text on background images/i)
      ).toBeVisible({ timeout: 10_000 });
    });

    test("sidebar shows Ad Generator entry", async ({ page }) => {
      await page.goto("/ad-generator");
      await page.waitForLoadState("networkidle");
      const sidebarLink = page.locator('a[href="/ad-generator"]');
      await expect(sidebarLink).toBeVisible({ timeout: 10_000 });
    });

    // ── Step 1: Guideline selector ──

    test("shows brand guideline selector", async ({ page }) => {
      await page.goto("/ad-generator");
      await page.waitForLoadState("networkidle");
      // Either a select button or empty state
      const hasSelect = await page.locator('button').filter({ hasText: /brand guideline|guideline/i }).count();
      const hasEmpty = await page.getByText(/no brand guidelines/i).count();
      expect(hasSelect + hasEmpty).toBeGreaterThan(0);
    });

    // ── Step 3: Text Variants ──

    test("shows text variants input field", async ({ page }) => {
      await page.goto("/ad-generator");
      await page.waitForLoadState("networkidle");
      await expect(page.getByPlaceholder(/ad copy|headline|text variant/i)).toBeVisible({ timeout: 10_000 });
    });

    // ── Step 4: Styling controls ──

    test("shows font family selector", async ({ page }) => {
      await page.goto("/ad-generator");
      await page.waitForLoadState("networkidle");
      await expect(page.getByText(/font/i)).toBeVisible({ timeout: 10_000 });
    });

    test("shows text color picker", async ({ page }) => {
      await page.goto("/ad-generator");
      await page.waitForLoadState("networkidle");
      await expect(page.getByText(/text color/i)).toBeVisible({ timeout: 10_000 });
    });

    test("shows text position options", async ({ page }) => {
      await page.goto("/ad-generator");
      await page.waitForLoadState("networkidle");
      await expect(page.getByText(/position|placement/i)).toBeVisible({ timeout: 10_000 });
    });

    // ── Generate button ──

    test("Generate Previews button is disabled when form incomplete", async ({ page }) => {
      await page.goto("/ad-generator");
      await page.waitForLoadState("networkidle");
      const genButton = page.getByRole("button", { name: /generate previews/i });
      await expect(genButton).toBeVisible({ timeout: 10_000 });
      await expect(genButton).toBeDisabled();
    });

    // ── Ads History ──

    test("shows Ads History section", async ({ page }) => {
      await page.goto("/ad-generator");
      await page.waitForLoadState("networkidle");
      // History section heading
      await expect(
        page.getByRole("heading", { name: /history|saved ads/i })
      ).toBeVisible({ timeout: 10_000 });
    });
  });
});
