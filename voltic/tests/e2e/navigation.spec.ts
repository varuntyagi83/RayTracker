import { test, expect } from "@playwright/test";

test.describe("Navigation & Layout", () => {
  test.describe("Public Routes", () => {
    test("login page loads without errors", async ({ page }) => {
      const response = await page.goto("/login");
      expect(response?.status()).toBeLessThan(500);
    });

    test("signup page loads without errors", async ({ page }) => {
      const response = await page.goto("/signup");
      expect(response?.status()).toBeLessThan(500);
    });

    test("root page redirects appropriately", async ({ page }) => {
      await page.goto("/");
      // Should redirect to either /login or /home depending on auth
      await page.waitForURL(/\/(login|home|signup)/, { timeout: 10_000 });
    });
  });

  test.describe("Page Response Codes", () => {
    const protectedRoutes = [
      "/home",
      "/automations",
      "/boards",
      "/discover",
      "/settings",
      "/assets",
      "/competitors",
      "/creative-studio",
      "/brand-guidelines",
      "/decomposition",
      "/credits",
      "/campaign-analysis",
      "/reports/top-ads",
      "/reports/top-campaigns",
      "/reports/top-creatives",
      "/reports/top-landing-pages",
      "/reports/top-headlines",
      "/reports/top-copy",
    ];

    for (const route of protectedRoutes) {
      test(`${route} does not return 500`, async ({ page }) => {
        const response = await page.goto(route);
        // Should either serve page or redirect — never 500
        expect(response?.status()).toBeLessThan(500);
      });
    }
  });

  test.describe("Login Page Navigation", () => {
    test("login has link to signup", async ({ page }) => {
      await page.goto("/login");
      const signupLink = page.getByRole("link", { name: /sign up/i });
      await expect(signupLink).toBeVisible();
      await expect(signupLink).toHaveAttribute("href", /signup/);
    });

    test("signup has link to login", async ({ page }) => {
      await page.goto("/signup");
      const loginLink = page.getByRole("link", { name: /log in/i });
      await expect(loginLink).toBeVisible();
      await expect(loginLink).toHaveAttribute("href", /login/);
    });
  });

  test.describe("Meta Tags & SEO", () => {
    test("login page has proper title", async ({ page }) => {
      await page.goto("/login");
      await expect(page).toHaveTitle(/.+/);
    });

    test("signup page has proper title", async ({ page }) => {
      await page.goto("/signup");
      await expect(page).toHaveTitle(/.+/);
    });
  });

  test.describe("Responsive Layout", () => {
    test("login page is mobile-friendly", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto("/login");

      const emailInput = page.locator("#email");
      await expect(emailInput).toBeVisible();

      // Check form is not overflowing
      const emailBox = await emailInput.boundingBox();
      expect(emailBox).not.toBeNull();
      expect(emailBox!.x).toBeGreaterThanOrEqual(0);
      expect(emailBox!.x + emailBox!.width).toBeLessThanOrEqual(375);
    });

    test("login page works on tablet", async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto("/login");

      await expect(page.locator("#email")).toBeVisible();
      await expect(
        page.getByRole("button", { name: /sign in/i })
      ).toBeVisible();
    });
  });
});
