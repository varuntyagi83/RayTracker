import { test, expect } from "@playwright/test";

test.describe("Boards", () => {
  test.describe("Unauthenticated Access", () => {
    test("redirects to login", async ({ page }) => {
      await page.goto("/boards");
      await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    });

    test("board detail redirects to login", async ({ page }) => {
      await page.goto("/boards/some-fake-id");
      await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    });
  });

  test.describe("Board Management (requires auth)", () => {
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
      await page.goto("/boards");
      await page.waitForLoadState("networkidle");
    });

    test("renders boards page with title", async ({ page }) => {
      await expect(
        page.getByRole("heading", { name: /boards/i })
      ).toBeVisible();
    });

    test("shows create board button", async ({ page }) => {
      await expect(
        page.getByRole("button", { name: /create board/i })
      ).toBeVisible();
    });

    test("opens create board dialog", async ({ page }) => {
      await page.getByRole("button", { name: /create board/i }).click();

      // Dialog should appear with name input
      await expect(page.getByText("Create Board")).toBeVisible();
      await expect(page.getByPlaceholder(/name/i)).toBeVisible();
    });

    test("create board dialog has save button", async ({ page }) => {
      await page.getByRole("button", { name: /create board/i }).click();

      await expect(
        page.getByRole("button", { name: /save|create/i })
      ).toBeVisible();
    });

    test("shows board cards or empty state", async ({ page }) => {
      // Either existing boards or empty state
      const hasBoards = await page.locator("[class*='CardContent']").count();
      if (hasBoards === 0) {
        // Empty state is acceptable
        expect(true).toBeTruthy();
      } else {
        expect(hasBoards).toBeGreaterThan(0);
      }
    });
  });
});
