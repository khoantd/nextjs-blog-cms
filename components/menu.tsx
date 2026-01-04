"use client";
import { Button } from "@/components/ui/button";
import { FileTextIcon, ZapIcon, TrendingUp, DollarSign, Users } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { UserProfile } from "./user-profile";
import { useSession } from "next-auth/react";
import { canViewUsers } from "@/lib/client-auth";

export const Menu = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  
  const canManageUsers = session ? canViewUsers(session.user.role) : false;
  return (
    <div className="flex flex-col h-full">
      <nav className="flex-1">
        <Button
          variant={
            pathname.startsWith("/blog-posts") || pathname.startsWith("/blog-post")
              ? "default"
              : "ghost"
          }
          className="w-full justify-start mb-2"
          onClick={() => router.push("/blog-posts")}
        >
          <FileTextIcon className="mr-2 h-4 w-4" />
          Posts
        </Button>
        <Button
          variant={
            pathname.startsWith("/stock-analyses") || pathname.startsWith("/stock-analysis")
              ? "default"
              : "ghost"
          }
          className="w-full justify-start mb-2"
          onClick={() => router.push("/stock-analyses")}
        >
          <TrendingUp className="mr-2 h-4 w-4" />
          Stock Analysis
        </Button>
        <Button
          variant={pathname.startsWith("/stock-price-demo") ? "default" : "ghost"}
          className="w-full justify-start mb-2"
          onClick={() => router.push("/stock-price-demo")}
        >
          <DollarSign className="mr-2 h-4 w-4" />
          Stock Price
        </Button>
        <Button
          variant={pathname.startsWith("/workflows") ? "default" : "ghost"}
          className="w-full justify-start"
          onClick={() => router.push("/workflows")}
        >
          <ZapIcon className="mr-2 h-4 w-4" />
          Automation
        </Button>
        {canManageUsers && (
          <Button
            variant={pathname.startsWith("/users") ? "default" : "ghost"}
            className="w-full justify-start"
            onClick={() => router.push("/users")}
          >
            <Users className="mr-2 h-4 w-4" />
            Users
          </Button>
        )}
      </nav>
      <UserProfile />
    </div>
  );
};
