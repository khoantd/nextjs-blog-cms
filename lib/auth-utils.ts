import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { redirect } from "next/navigation";
import { UserRole } from "./types";

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  console.log("Session in getCurrentUser:", session?.user);
  return session?.user;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent("/")}`);
  }
  return user;
}

export async function requireRole(requiredRole: UserRole) {
  const user = await requireAuth();

  const roleHierarchy: Record<UserRole, number> = {
    viewer: 1,
    editor: 2,
    admin: 3,
  };

  if (roleHierarchy[user.role] < roleHierarchy[requiredRole]) {
    redirect("/unauthorized");
  }

  return user;
}
