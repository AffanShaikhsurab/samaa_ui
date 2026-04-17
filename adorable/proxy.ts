/**
 * proxy.ts — Clerk authentication middleware for Next.js 16
 *
 * Next.js 16 renamed middleware.ts → proxy.ts.
 * This file runs on every request and makes auth() available
 * server-side via clerkMiddleware().
 *
 * Route protection:
 *   Protected app routes → auth.protect() redirects to /sign-in
 *   Protected API routes → auth.protect() returns 401 JSON
 *   Public routes        → no-op (pass through)
 */

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// ── App page routes that require sign-in ──────────────────────────────────
const isProtectedAppRoute = createRouteMatcher([
  "/flutter(.*)",      // entire Flutter builder (workspace + landing)
  "/dashboard(.*)",
  "/templates(.*)",
  "/settings(.*)",
  "/profile(.*)",
]);

// ── API routes (all protected unless listed in isPublicApiRoute) ──────────
const isApiRoute = createRouteMatcher(["/api(.*)"]);

const isPublicApiRoute = createRouteMatcher([
  "/api/health(.*)",
  "/api/webhooks(.*)",   // webhook routes verify their own HMAC signatures
  // Note: /api/api-key and /api/builder/sessions ARE protected —
  // they return JSON 401 from their route handlers for unauthenticated users.
  // We let auth.protect() handle them here to be consistent.
]);

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl;
  const method = req.method;

  // Log every request through proxy for full traceability in the terminal
  const isProtected = isProtectedAppRoute(req) || (isApiRoute(req) && !isPublicApiRoute(req));
  console.log(
    `[Proxy] ${method} ${pathname} | protected=${isProtected}`,
  );

  if (isProtectedAppRoute(req)) {
    await auth.protect();
    const { userId } = await auth();
    console.log(`[Proxy] App route OK | userId=${userId?.slice(0, 10)}… | ${pathname}`);
    return;
  }

  if (isApiRoute(req) && !isPublicApiRoute(req)) {
    await auth.protect();
    const { userId } = await auth();
    console.log(`[Proxy] API route OK | userId=${userId?.slice(0, 10)}… | ${pathname}`);
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
