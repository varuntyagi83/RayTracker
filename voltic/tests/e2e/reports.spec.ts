import { test, expect } from "@playwright/test";

test.describe("Reports", () => {
  const reportRoutes = [
    { path: "/reports/top-ads", title: "Top Ads" },
    { path: "/reports/top-campaigns", title: "Top Campaigns" },
    { path: "/reports/top-creatives", title: "Top Creatives" },
    { path: "/reports/top-landing-pages", title: "Top Landing Pages" },
    { path: "/reports/top-headlines", title: "Top Headlines" },
    { path: "/reports/top-copy", title: "Top Copy" },
  ];

  test.describe("Unauthenticated Access", () => {
    for (const route of reportRoutes) {
      test(`${route.title} redirects to login`, async ({ page }) => {
        await page.goto(route.path);
        await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
      });
    }
  });

  test.describe("Report Pages (requires auth)", () => {
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

    for (const route of reportRoutes) {
      test(`${route.title} page loads and shows title`, async ({ page }) => {
        await page.goto(route.path);
        await page.waitForLoadState("networkidle");
        await expect(
          page.getByRole("heading", { name: new RegExp(route.title, "i") })
        ).toBeVisible({ timeout: 10_000 });
      });
    }

    test("report page shows date filter", async ({ page }) => {
      await page.goto("/reports/top-ads");
      await page.waitForLoadState("networkidle");

      // Date preset selector should exist
      const content = await page.textContent("body");
      const hasDateFilter =
        content?.includes("7 days") ||
        content?.includes("30 days") ||
        content?.includes("Last") ||
        content?.includes("Today");
      expect(hasDateFilter).toBeTruthy();
    });

    test("report page shows table headers", async ({ page }) => {
      await page.goto("/reports/top-creatives");
      await page.waitForLoadState("networkidle");

      // Should show common report table headers
      await expect(page.getByText(/spend/i)).toBeVisible({ timeout: 10_000 });
    });
  });
});
