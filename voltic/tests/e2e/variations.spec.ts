import { test, expect } from "@playwright/test";

test.describe("Variations Page", () => {
  // ── Unauthenticated ──────────────────────────────────────────────────────

  test.describe("Unauthenticated Access", () => {
    test("redirects to login", async ({ page }) => {
      await page.goto("/variations");
      await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    });
  });

  test.describe("Page Response", () => {
    test("/variations does not return 500", async ({ page }) => {
      const response = await page.goto("/variations");
      expect(response?.status()).toBeLessThan(500);
    });
  });

  // ── Authenticated ────────────────────────────────────────────────────────

  test.describe("Authenticated Variations Page", () => {
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

    // ── Page load & header ──

    test("page loads with heading", async ({ page }) => {
      await page.goto("/variations");
      await page.waitForLoadState("networkidle");
      await expect(
        page.getByRole("heading", { name: /variations/i })
      ).toBeVisible({ timeout: 10_000 });
    });

    test("page has description text", async ({ page }) => {
      await page.goto("/variations");
      await page.waitForLoadState("networkidle");
      await expect(
        page.getByText(/generate ad variations/i)
      ).toBeVisible({ timeout: 10_000 });
    });

    // ── Sidebar entry ──

    test("sidebar shows Variations entry", async ({ page }) => {
      await page.goto("/variations");
      await page.waitForLoadState("networkidle");

      const sidebarLink = page.locator('a[href="/variations"]');
      await expect(sidebarLink).toBeVisible({ timeout: 10_000 });
    });

    // ── 4-Step form structure ──

    test("shows step 1: Select Competitor Ad", async ({ page }) => {
      await page.goto("/variations");
      await page.waitForLoadState("networkidle");
      await expect(
        page.getByText("Select Competitor Ad")
      ).toBeVisible({ timeout: 10_000 });
    });

    test("shows step 2: Select Your Product", async ({ page }) => {
      await page.goto("/variations");
      await page.waitForLoadState("networkidle");
      await expect(
        page.getByText("Select Your Product")
      ).toBeVisible({ timeout: 10_000 });
    });

    test("shows step 3: Choose Channel", async ({ page }) => {
      await page.goto("/variations");
      await page.waitForLoadState("networkidle");
      await expect(
        page.getByText("Choose Channel")
      ).toBeVisible({ timeout: 10_000 });
    });

    test("shows step 4: Select Strategies", async ({ page }) => {
      await page.goto("/variations");
      await page.waitForLoadState("networkidle");
      await expect(
        page.getByText("Select Strategies")
      ).toBeVisible({ timeout: 10_000 });
    });

    // ── Board selection ──

    test("shows board dropdown or empty state", async ({ page }) => {
      await page.goto("/variations");
      await page.waitForLoadState("networkidle");

      // Either shows the board select trigger or an empty message
      const hasSelect = await page.locator('button:has-text("Choose a board")').count();
      const hasEmpty = await page.getByText(/no boards found/i).count();
      expect(hasSelect + hasEmpty).toBeGreaterThan(0);
    });

    // ── Channel buttons ──

    test("shows all 5 channel buttons", async ({ page }) => {
      await page.goto("/variations");
      await page.waitForLoadState("networkidle");

      for (const channel of ["Facebook", "Instagram", "TikTok", "LinkedIn", "Google Ads"]) {
        await expect(page.getByRole("button", { name: channel })).toBeVisible({
          timeout: 10_000,
        });
      }
    });

    test("Facebook is selected by default", async ({ page }) => {
      await page.goto("/variations");
      await page.waitForLoadState("networkidle");

      const fbButton = page.getByRole("button", { name: "Facebook" });
      await expect(fbButton).toBeVisible({ timeout: 10_000 });
      // Check it has the active/primary styling
      await expect(fbButton).toHaveClass(/border-primary/);
    });

    test("channel selection toggles active state", async ({ page }) => {
      await page.goto("/variations");
      await page.waitForLoadState("networkidle");

      const igButton = page.getByRole("button", { name: "Instagram" });
      await igButton.click();
      await expect(igButton).toHaveClass(/border-primary/);

      // Facebook should no longer be primary
      const fbButton = page.getByRole("button", { name: "Facebook" });
      await expect(fbButton).not.toHaveClass(/border-primary/);
    });

    // ── Strategy cards ──

    test("shows all 6 strategy cards", async ({ page }) => {
      await page.goto("/variations");
      await page.waitForLoadState("networkidle");

      for (const label of [
        "Hero Product",
        "Curiosity",
        "Pain Point",
        "Proof Point",
        "Image Only",
        "Text Only",
      ]) {
        await expect(page.getByText(label, { exact: true })).toBeVisible({
          timeout: 10_000,
        });
      }
    });

    test("strategy cards toggle selection", async ({ page }) => {
      await page.goto("/variations");
      await page.waitForLoadState("networkidle");

      // Click a strategy card
      const heroCard = page.locator("button").filter({ hasText: "Hero Product" });
      await heroCard.click();

      // Should show cost summary
      await expect(page.getByText(/1 strategy/)).toBeVisible({ timeout: 5_000 });
      await expect(page.getByText(/10 credits/)).toBeVisible();
    });

    test("multiple strategies show correct credit cost", async ({ page }) => {
      await page.goto("/variations");
      await page.waitForLoadState("networkidle");

      // Select 3 strategies
      await page.locator("button").filter({ hasText: "Hero Product" }).click();
      await page.locator("button").filter({ hasText: "Curiosity" }).click();
      await page.locator("button").filter({ hasText: "Pain Point" }).click();

      await expect(page.getByText(/3 strategies/)).toBeVisible({ timeout: 5_000 });
      await expect(page.getByText(/30 credits/)).toBeVisible();
    });

    // ── Asset tabs ──

    test("shows Choose Existing and Upload New tabs", async ({ page }) => {
      await page.goto("/variations");
      await page.waitForLoadState("networkidle");

      await expect(page.getByRole("tab", { name: /choose existing/i })).toBeVisible({
        timeout: 10_000,
      });
      await expect(page.getByRole("tab", { name: /upload new/i })).toBeVisible();
    });

    test("Upload New tab shows upload form", async ({ page }) => {
      await page.goto("/variations");
      await page.waitForLoadState("networkidle");

      await page.getByRole("tab", { name: /upload new/i }).click();

      await expect(page.getByText(/click to upload/i)).toBeVisible({
        timeout: 10_000,
      });
      await expect(page.getByPlaceholder(/product name/i)).toBeVisible();
    });

    // ── Generate button ──

    test("generate button is disabled when form incomplete", async ({ page }) => {
      await page.goto("/variations");
      await page.waitForLoadState("networkidle");

      const genButton = page.getByRole("button", { name: /generate variations/i });
      await expect(genButton).toBeVisible({ timeout: 10_000 });
      await expect(genButton).toBeDisabled();
    });

    // ── Variation History section ──

    test("shows Variation History heading", async ({ page }) => {
      await page.goto("/variations");
      await page.waitForLoadState("networkidle");

      await expect(
        page.getByRole("heading", { name: /variation history/i })
      ).toBeVisible({ timeout: 10_000 });
    });

    test("shows empty state or variation cards in history", async ({ page }) => {
      await page.goto("/variations");
      await page.waitForLoadState("networkidle");

      // Either empty state or variation cards
      const hasEmpty = await page.getByText(/no variations yet/i).count();
      const hasCards = await page.locator("[class*='Card']").count();
      // At least one of them should be present (either empty state text or cards)
      expect(hasEmpty + hasCards).toBeGreaterThan(0);
    });
  });
});
