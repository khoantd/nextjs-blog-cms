import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    // If user is authenticated and tries to access auth pages, redirect to home
    if (req.nextauth.token && req.nextUrl.pathname.startsWith("/auth/signin")) {
      const homeUrl = new URL("/", req.url);
      // Clear all search parameters to prevent redirect loops
      homeUrl.search = "";
      return NextResponse.redirect(homeUrl);
    }
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow API routes to handle their own authentication
        // They will return proper JSON 401/403 responses
        if (req.nextUrl.pathname.startsWith("/api/")) {
          return true;
        }
        // Allow access to auth pages when not authenticated
        if (req.nextUrl.pathname.startsWith("/auth/")) {
          return true;
        }
        // Allow public access to blog posts
        if (req.nextUrl.pathname.startsWith("/blog-post/")) {
          return true;
        }
        if (req.nextUrl.pathname.startsWith("/blog-posts")) {
          return true;
        }
        // Require authentication for all other pages
        return !!token;
      },
    },
    pages: {
      signIn: "/auth/signin",
      error: "/auth/error",
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth API routes)
     * - api/debug (debug API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!api/auth|api/debug|api/inngest|_next/static|_next/image|favicon.ico|.*\\.png$).*)",
  ],
};
