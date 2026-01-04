"use client";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { UserList } from "@/components/user-list";
import { canViewUsers } from "@/lib/client-auth";

export default function UsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;

    if (!session) {
      router.replace("/auth/signin");
      return;
    }

    if (!canViewUsers(session.user.role)) {
      router.replace("/unauthorized");
      return;
    }
  }, [session, status, router]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!session || !canViewUsers(session.user.role)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Redirecting...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <UserList />
    </div>
  );
}
