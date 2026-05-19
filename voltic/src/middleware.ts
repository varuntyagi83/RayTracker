import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/login(.*)",
  "/signup(.*)",
  "/onboarding(.*)",
  "/auth(.*)",
  "/",
  // Webhooks: validated by their own signature/secret checks
  "/api/webhooks/(.*)",
  // MCP: validated by Bearer API key
  "/api/mcp(.*)",
  // Chrome extension: validated by Clerk verifyToken
  "/api/extension/(.*)",
  // Public page search (rate-limited by IP)
  "/api/meta/page-search",
]);

const isAuthRoute = createRouteMatcher(["/login", "/signup", "/"]);

export default clerkMiddleware(async (auth, request) => {
  const { userId } = await auth();

  if (!isPublicRoute(request) && !userId) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (userId && isAuthRoute(request)) {
    return NextResponse.redirect(new URL("/home", request.url));
  }
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
