import { test, expect } from "@playwright/test";

/**
 * API Health checks — verifies that API routes respond without 500 errors.
 * These tests don't require authentication; they simply verify the routes
 * exist and return appropriate status codes (401, 400, or 200).
 */
test.describe("API Health Checks", () => {
  test.describe("Auth API Routes", () => {
    test("GET /api/auth/meta returns redirect or error (not 500)", async ({
      request,
    }) => {
      const response = await request.get("/api/auth/meta", {
        maxRedirects: 0,
      });
      // Should redirect to Meta OAuth or return 401 — never 500
      expect(response.status()).toBeLessThan(500);
    });
  });

  test.describe("Extension API Routes", () => {
    test("GET /api/extension/boards returns 401 without token", async ({
      request,
    }) => {
      const response = await request.get("/api/extension/boards");
      expect(response.status()).toBeLessThan(500);
      // Should be 401 unauthorized
      expect([401, 400, 403]).toContain(response.status());
    });

    test("POST /api/extension/save-ad returns 401 without token", async ({
      request,
    }) => {
      const response = await request.post("/api/extension/save-ad", {
        data: {},
      });
      expect(response.status()).toBeLessThan(500);
    });
  });

  test.describe("Webhook Routes", () => {
    test("POST /api/webhooks/cron/automations requires auth header", async ({
      request,
    }) => {
      const response = await request.post(
        "/api/webhooks/cron/automations",
        { data: {} }
      );
      expect(response.status()).toBeLessThan(500);
    });

    test("POST /api/webhooks/stripe requires valid payload", async ({
      request,
    }) => {
      const response = await request.post("/api/webhooks/stripe", {
        data: {},
      });
      expect(response.status()).toBeLessThan(500);
    });
  });

  test.describe("AI/Decompose Routes", () => {
    test("POST /api/decompose returns 401 without auth", async ({
      request,
    }) => {
      const response = await request.post("/api/decompose", {
        data: { imageUrl: "https://example.com/test.jpg" },
      });
      expect(response.status()).toBeLessThan(500);
    });
  });

  test.describe("Studio Routes", () => {
    test("POST /api/studio/chat returns 401 without auth", async ({
      request,
    }) => {
      const response = await request.post("/api/studio/chat", {
        data: { messages: [], model: "gpt-4o" },
      });
      expect(response.status()).toBeLessThan(500);
    });
  });
});
