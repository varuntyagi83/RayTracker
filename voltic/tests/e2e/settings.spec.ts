import { test, expect } from "@playwright/test";

test.describe("Settings", () => {
  test.describe("Unauthenticated Access", () => {
    test("redirects to login", async ({ page }) => {
      await page.goto("/settings");
      await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    });
  });

  test.describe("Settings Page (requires auth)", () => {
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
      await page.goto("/settings");
      await page.waitForLoadState("networkidle");
    });

    test("renders settings page with title", async ({ page }) => {
      await expect(
        page.getByRole("heading", { name: /settings/i })
      ).toBeVisible();
    });

    test("shows General and Brand Guidelines tabs", async ({ page }) => {
      await expect(page.getByText("General")).toBeVisible();
      await expect(page.getByText("Brand Guidelines")).toBeVisible();
    });

    test("shows Meta connection section", async ({ page }) => {
      const content = await page.textContent("body");
      const hasMeta =
        content?.includes("Meta") || content?.includes("Connect Meta");
      expect(hasMeta).toBeTruthy();
    });

    test("shows timezone section", async ({ page }) => {
      await expect(page.getByText(/timezone/i)).toBeVisible();
    });

    test("shows Chrome Extension section", async ({ page }) => {
      await expect(page.getByText(/chrome extension/i)).toBeVisible();
    });

    test("shows API token section", async ({ page }) => {
      await expect(page.getByText(/api token/i)).toBeVisible();
    });

    test("switches to Brand Guidelines tab", async ({ page }) => {
      await page.getByText("Brand Guidelines").click();
      await page.waitForTimeout(500);

      // Should show brand guidelines content or link
      const content = await page.textContent("body");
      const hasBrand =
        content?.includes("Brand") || content?.includes("guideline");
      expect(hasBrand).toBeTruthy();
    });
  });
});
