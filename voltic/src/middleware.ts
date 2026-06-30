import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/login(.*)",
  "/signup(.*)",
  "/onboarding(.*)",
  "/auth(.*)",
  "/",
  "/subscription/cancelled",
  "/subscription/paywall",
  // Webhooks: validated by their own signature/secret checks
  "/api/webhooks/(.*)",
  // Subscription checkout is called before auth check in some flows
  "/api/subscription/checkout",
  // MCP: validated by Bearer API key
  "/api/mcp(.*)",
  // Chrome extension: validated by Clerk verifyToken
  "/api/extension/(.*)",
  // Public page search (rate-limited by IP)
  "/api/meta/page-search",
]);

const isAuthRoute = createRouteMatcher(["/login", "/signup", "/"]);

// Billing/subscription pages exempt from paywall so lapsed users can resubscribe
const isSubscriptionExempt = createRouteMatcher([
  "/subscription/(.*)",
  "/settings/billing(.*)",
  "/api/subscription/(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  const { userId } = await auth();

  if (!isPublicRoute(request) && !userId) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (userId && isAuthRoute(request)) {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  // Subscription gate: block dashboard access for cancelled or past_due accounts
  if (userId && !isPublicRoute(request) && !isSubscriptionExempt(request)) {
    const subStatus = request.cookies.get("voltic-sub-status")?.value;
    if (subStatus === "canceled" || subStatus === "past_due") {
      return NextResponse.redirect(new URL("/subscription/paywall", request.url));
    }
  }
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
