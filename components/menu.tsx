"use client";
import { Button } from "@/components/ui/button";
import { FileTextIcon, ZapIcon, TrendingUp } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { UserProfile } from "./user-profile";

export const Menu = () => {
  const pathname = usePathname();
  const router = useRouter();
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
          variant={pathname.startsWith("/workflows") ? "default" : "ghost"}
          className="w-full justify-start"
          onClick={() => router.push("/workflows")}
        >
          <ZapIcon className="mr-2 h-4 w-4" />
          Automation
        </Button>
      </nav>
      <UserProfile />
    </div>
  );
};
