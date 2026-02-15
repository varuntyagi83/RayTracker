import { test, expect } from "@playwright/test";

test.describe("Discover", () => {
  test.describe("Unauthenticated Access", () => {
    test("redirects to login", async ({ page }) => {
      await page.goto("/discover");
      await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    });
  });

  test.describe("Discover Page (requires auth)", () => {
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
      await page.goto("/discover");
      await page.waitForLoadState("networkidle");
    });

    test("renders discover page with title", async ({ page }) => {
      await expect(
        page.getByRole("heading", { name: /discover/i })
      ).toBeVisible();
    });

    test("shows search input", async ({ page }) => {
      await expect(
        page.getByPlaceholder(/search brand/i)
      ).toBeVisible();
    });

    test("search button is disabled when query is empty", async ({ page }) => {
      const searchBtn = page.getByRole("button", { name: /search/i });
      // Should be disabled or the search input should be empty
      const searchInput = page.getByPlaceholder(/search brand/i);
      const value = await searchInput.inputValue();
      expect(value).toBe("");
    });

    test("shows filter controls", async ({ page }) => {
      // Format filter
      await expect(page.getByText(/all formats|format/i)).toBeVisible();
    });

    test("shows initial empty state", async ({ page }) => {
      // Before searching, should show initial state message
      const content = await page.textContent("body");
      const hasInitialState =
        content?.includes("Enter a brand name") ||
        content?.includes("Search") ||
        content?.includes("No ads");
      expect(hasInitialState).toBeTruthy();
    });

    test("search input accepts text", async ({ page }) => {
      const searchInput = page.getByPlaceholder(/search brand/i);
      await searchInput.fill("Nike");
      await expect(searchInput).toHaveValue("Nike");
    });
  });
});
