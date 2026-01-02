"use client";

import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LogOutIcon, UserIcon } from "lucide-react";
import Image from "next/image";

export const UserProfile = () => {
  const { data: session } = useSession();

  if (!session?.user) {
    return null;
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-purple-100 text-purple-800 border-purple-300";
      case "editor":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "viewer":
        return "bg-gray-100 text-gray-800 border-gray-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  return (
    <div className="mt-auto pt-4 border-t border-gray-200">
      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
        {session.user.image ? (
          <Image
            src={session.user.image}
            alt={session.user.name || "User"}
            width={40}
            height={40}
            className="rounded-full"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
            <UserIcon className="h-5 w-5 text-gray-600" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {session.user.name}
          </p>
          <p className="text-xs text-gray-500 truncate">{session.user.email}</p>
        </div>
      </div>

      <div className="mt-2 px-3">
        <div
          className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${getRoleBadgeColor(
            session.user.role
          )}`}
        >
          {session.user.role.charAt(0).toUpperCase() + session.user.role.slice(1)}
        </div>
      </div>

      <Button
        variant="ghost"
        className="w-full justify-start mt-2 text-red-600 hover:text-red-700 hover:bg-red-50"
        onClick={() => signOut({ callbackUrl: "/auth/signin" })}
      >
        <LogOutIcon className="mr-2 h-4 w-4" />
        Sign Out
      </Button>
    </div>
  );
};
