import { test, expect } from "@playwright/test";

test.describe("Automations", () => {
  test.describe("Unauthenticated Access", () => {
    test("redirects to login", async ({ page }) => {
      await page.goto("/automations");
      await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    });
  });

  test.describe("Automations Page (requires auth)", () => {
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
      await page.goto("/automations");
      await page.waitForLoadState("networkidle");
    });

    test("renders automations page with title", async ({ page }) => {
      await expect(
        page.getByRole("heading", { name: /automations/i })
      ).toBeVisible();
    });

    test("shows filter buttons", async ({ page }) => {
      await expect(page.getByRole("button", { name: /all/i })).toBeVisible();
    });

    test("shows create automation button", async ({ page }) => {
      const createBtn = page.getByRole("button", {
        name: /create automation|new automation/i,
      });
      await expect(createBtn).toBeVisible();
    });

    test("create automation dropdown shows types", async ({ page }) => {
      const createBtn = page.getByRole("button", {
        name: /create automation|new automation/i,
      });
      await createBtn.click();

      // Should show automation type options
      await expect(page.getByText(/performance/i)).toBeVisible({ timeout: 5_000 });
    });

    test("shows automation cards or empty state", async ({ page }) => {
      // Wait for content to load
      await page.waitForTimeout(2_000);

      // Either has automation cards or shows empty state
      const pageContent = await page.textContent("body");
      const hasContent =
        pageContent?.includes("No automations") ||
        (await page.locator("[class*='Card']").count()) > 0;
      expect(hasContent).toBeTruthy();
    });
  });
});
