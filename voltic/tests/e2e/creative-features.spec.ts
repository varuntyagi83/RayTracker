import { test, expect } from "@playwright/test";

test.describe("Creative Features", () => {
  test.describe("Assets Page", () => {
    test("redirects unauthenticated to login", async ({ page }) => {
      await page.goto("/assets");
      await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    });
  });

  test.describe("Creative Studio", () => {
    test("redirects unauthenticated to login", async ({ page }) => {
      await page.goto("/creative-studio");
      await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    });
  });

  test.describe("Brand Guidelines", () => {
    test("redirects unauthenticated to login", async ({ page }) => {
      await page.goto("/brand-guidelines");
      await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    });
  });

  test.describe("Decomposition", () => {
    test("redirects unauthenticated to login", async ({ page }) => {
      await page.goto("/decomposition");
      await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    });
  });

  test.describe("Competitors", () => {
    test("redirects unauthenticated to login", async ({ page }) => {
      await page.goto("/competitors");
      await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    });
  });

  test.describe("Campaign Analysis", () => {
    test("redirects unauthenticated to login", async ({ page }) => {
      await page.goto("/campaign-analysis");
      await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    });
  });

  test.describe("Credits", () => {
    test("redirects unauthenticated to login", async ({ page }) => {
      await page.goto("/credits");
      await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    });
  });

  test.describe("Authenticated Creative Features", () => {
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

    test("assets page loads", async ({ page }) => {
      await page.goto("/assets");
      await page.waitForLoadState("networkidle");
      await expect(
        page.getByRole("heading", { name: /assets/i })
      ).toBeVisible({ timeout: 10_000 });
    });

    test("creative studio page loads", async ({ page }) => {
      await page.goto("/creative-studio");
      await page.waitForLoadState("networkidle");
      await expect(
        page.getByRole("heading", { name: /creative studio/i })
      ).toBeVisible({ timeout: 10_000 });
    });

    test("brand guidelines page loads", async ({ page }) => {
      await page.goto("/brand-guidelines");
      await page.waitForLoadState("networkidle");
      await expect(
        page.getByRole("heading", { name: /brand guidelines/i })
      ).toBeVisible({ timeout: 10_000 });
    });

    test("decomposition page loads", async ({ page }) => {
      await page.goto("/decomposition");
      await page.waitForLoadState("networkidle");
      await expect(
        page.getByRole("heading", { name: /decomposition|decompose/i })
      ).toBeVisible({ timeout: 10_000 });
    });

    test("competitors page loads", async ({ page }) => {
      await page.goto("/competitors");
      await page.waitForLoadState("networkidle");
      await expect(
        page.getByRole("heading", { name: /competitor/i })
      ).toBeVisible({ timeout: 10_000 });
    });

    test("campaign analysis page loads", async ({ page }) => {
      await page.goto("/campaign-analysis");
      await page.waitForLoadState("networkidle");
      await expect(
        page.getByRole("heading", { name: /campaign/i })
      ).toBeVisible({ timeout: 10_000 });
    });

    test("credits page loads", async ({ page }) => {
      await page.goto("/credits");
      await page.waitForLoadState("networkidle");
      await expect(
        page.getByRole("heading", { name: /credits/i })
      ).toBeVisible({ timeout: 10_000 });
    });
  });
});
