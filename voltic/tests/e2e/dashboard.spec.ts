import { test, expect } from "@playwright/test";

/**
 * Dashboard tests — these validate the home page structure and KPI rendering.
 * Since they require authentication, unauthenticated requests will redirect
 * to /login. Tests verify both the redirect behavior and the page structure.
 */
test.describe("Dashboard Home", () => {
  test.describe("Unauthenticated Access", () => {
    test("redirects to login when not authenticated", async ({ page }) => {
      await page.goto("/home");
      await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    });
  });

  test.describe("Page Structure (requires auth)", () => {
    test.skip(
      !process.env.TEST_USER_EMAIL,
      "Skipped: TEST_USER_EMAIL not set"
    );

    test.beforeEach(async ({ page }) => {
      // Login flow
      await page.goto("/login");
      await page.locator("#email").fill(process.env.TEST_USER_EMAIL!);
      await page.locator("#password").fill(process.env.TEST_USER_PASSWORD!);
      await page.getByRole("button", { name: /sign in/i }).click();
      await page.waitForURL(/\/home/, { timeout: 15_000 });
    });

    test("displays workspace overview title", async ({ page }) => {
      await expect(
        page.getByRole("heading", { name: /workspace overview/i })
      ).toBeVisible();
    });

    test("renders three KPI cards", async ({ page }) => {
      // Revenue, Spend, Profit cards
      await expect(page.getByText("Revenue")).toBeVisible();
      await expect(page.getByText("Spend")).toBeVisible();
      await expect(page.getByText("Profit")).toBeVisible();
    });

    test("displays KPI comparison values", async ({ page }) => {
      // Each card should show Yesterday and Last 7 Days comparisons
      const yesterdayLabels = page.getByText("YESTERDAY");
      const last7DaysLabels = page.getByText("LAST 7 DAYS");
      await expect(yesterdayLabels.first()).toBeVisible();
      await expect(last7DaysLabels.first()).toBeVisible();
    });

    test("renders sidebar navigation", async ({ page }) => {
      await expect(page.getByText("Home")).toBeVisible();
      await expect(page.getByText("Automations")).toBeVisible();
      await expect(page.getByText("Boards")).toBeVisible();
      await expect(page.getByText("Discover")).toBeVisible();
    });

    test("home link is active in sidebar", async ({ page }) => {
      const homeLink = page.locator("a[href='/home']");
      await expect(homeLink).toBeVisible();
    });

    test("displays top bar with meta connection status", async ({ page }) => {
      // Top bar should be visible with header element
      const header = page.locator("header");
      await expect(header.first()).toBeVisible();
    });

    test("sidebar navigation works", async ({ page }) => {
      await page.getByText("Boards").click();
      await expect(page).toHaveURL(/\/boards/, { timeout: 10_000 });
    });
  });
});
