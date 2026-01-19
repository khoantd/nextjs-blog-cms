"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";

/**
 * Component that redirects OAuth users to password setup page if password is required
 * This should be placed in the root layout to check on every page load
 */
export function PasswordRedirect() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    // Don't redirect if:
    // - Session is loading
    // - User is not authenticated
    // - Already on password setup page
    // - Already on auth pages
    // - Already checked
    if (
      status === "loading" ||
      status === "unauthenticated" ||
      pathname === "/auth/set-password" ||
      pathname?.startsWith("/auth/") ||
      pathname?.startsWith("/api/") ||
      hasChecked
    ) {
      return;
    }

    // Check password status directly via API
    const checkPasswordStatus = async () => {
      if (!session?.user?.email) {
        setHasChecked(true);
        return;
      }

      try {
        const response = await fetch(
          `/api/auth/password-status?email=${encodeURIComponent(session.user.email)}`
        );

        if (response.ok) {
          const data = await response.json();
          const requiresPassword = data.data?.requiresPassword ?? false;

          if (requiresPassword) {
            console.log("[PasswordRedirect] Password required, redirecting to setup page");
            router.push("/auth/set-password");
          }
        }
      } catch (error) {
        console.error("[PasswordRedirect] Failed to check password status:", error);
      } finally {
        setHasChecked(true);
      }
    };

    checkPasswordStatus();
  }, [session, status, router, pathname, hasChecked]);

  return null;
}
