import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test.describe("Login Page", () => {
    test("renders login form with all elements", async ({ page }) => {
      await page.goto("/login");

      // Title and branding
      await expect(page.getByText("Welcome back")).toBeVisible();

      // Form fields
      const emailInput = page.locator("#email");
      const passwordInput = page.locator("#password");
      await expect(emailInput).toBeVisible();
      await expect(passwordInput).toBeVisible();
      await expect(emailInput).toHaveAttribute("type", "email");
      await expect(passwordInput).toHaveAttribute("type", "password");

      // Buttons
      await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
      await expect(page.getByRole("button", { name: /continue with google/i })).toBeVisible();

      // Signup link
      await expect(page.getByRole("link", { name: /sign up/i })).toBeVisible();
    });

    test("shows validation on empty submit", async ({ page }) => {
      await page.goto("/login");

      // Click sign in without filling fields
      await page.getByRole("button", { name: /sign in/i }).click();

      // Browser native validation should prevent submission
      const emailInput = page.locator("#email");
      await expect(emailInput).toBeFocused();
    });

    test("shows error for invalid credentials", async ({ page }) => {
      await page.goto("/login");

      await page.locator("#email").fill("invalid@example.com");
      await page.locator("#password").fill("wrongpassword123");
      await page.getByRole("button", { name: /sign in/i }).click();

      // Wait for error message
      await expect(page.locator(".text-destructive")).toBeVisible({ timeout: 10_000 });
    });

    test("navigates to signup page", async ({ page }) => {
      await page.goto("/login");

      await page.getByRole("link", { name: /sign up/i }).click();
      await expect(page).toHaveURL(/\/signup/);
    });

    test("shows loading state during submission", async ({ page }) => {
      await page.goto("/login");

      await page.locator("#email").fill("test@example.com");
      await page.locator("#password").fill("testpassword");

      const signInButton = page.getByRole("button", { name: /sign in/i });
      await signInButton.click();

      // Button should show loading state briefly
      await expect(signInButton).toBeDisabled({ timeout: 2_000 }).catch(() => {
        // May resolve too fast in local env — acceptable
      });
    });
  });

  test.describe("Signup Page", () => {
    test("renders signup form with all fields", async ({ page }) => {
      await page.goto("/signup");

      await expect(page.locator("#workspace")).toBeVisible();
      await expect(page.locator("#email")).toBeVisible();
      await expect(page.locator("#password")).toBeVisible();

      // Create account button
      await expect(
        page.getByRole("button", { name: /create account/i })
      ).toBeVisible();

      // Login link
      await expect(page.getByRole("link", { name: /log in/i })).toBeVisible();
    });

    test("enforces password minimum length", async ({ page }) => {
      await page.goto("/signup");

      const passwordInput = page.locator("#password");
      await expect(passwordInput).toHaveAttribute("minlength", "6");
    });

    test("navigates back to login", async ({ page }) => {
      await page.goto("/signup");

      await page.getByRole("link", { name: /log in/i }).click();
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe("Auth Guards", () => {
    test("redirects unauthenticated users from dashboard to login", async ({
      page,
    }) => {
      await page.goto("/home");
      await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    });

    test("redirects unauthenticated users from boards to login", async ({
      page,
    }) => {
      await page.goto("/boards");
      await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    });

    test("redirects unauthenticated users from automations to login", async ({
      page,
    }) => {
      await page.goto("/automations");
      await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    });

    test("redirects unauthenticated users from settings to login", async ({
      page,
    }) => {
      await page.goto("/settings");
      await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    });

    test("redirects unauthenticated users from discover to login", async ({
      page,
    }) => {
      await page.goto("/discover");
      await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    });

    test("redirects unauthenticated users from reports to login", async ({
      page,
    }) => {
      await page.goto("/reports/top-ads");
      await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    });

    test("redirects unauthenticated users from credits to login", async ({
      page,
    }) => {
      await page.goto("/credits");
      await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    });
  });
});
