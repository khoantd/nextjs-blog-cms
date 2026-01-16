"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  User, 
  Settings, 
  LogOut, 
  Star,
  FileText,
  Bell
} from "lucide-react";

export function UserMenu() {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await signOut({ callbackUrl: "/auth/signin" });
    } catch (error) {
      console.error("Sign out error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!session) {
    return (
      <div className="flex items-center space-x-2">
        <Button variant="outline" size="sm" asChild>
          <a href="/auth/signin">Sign In</a>
        </Button>
      </div>
    );
  }

  const userInitials = session.user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

  return (
    <div className="flex items-center space-x-3">
      {/* Notifications */}
      <Button variant="ghost" size="sm" className="relative">
        <Bell className="w-4 h-4" />
        <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
      </Button>

      {/* User Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarImage 
                src={session.user?.image || ""} 
                alt={session.user?.name || ""} 
              />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm font-medium">
                {userInitials}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none text-foreground">
                {session.user?.name}
              </p>
              <p className="text-xs leading-none text-foreground/80">
                {session.user?.email}
              </p>
              <div className="flex items-center space-x-1 mt-1">
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full border border-blue-200">
                  {session.user?.role || "viewer"}
                </span>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="flex items-center space-x-2 cursor-pointer">
            <User className="w-4 h-4" />
            <span>Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href="/favorites" className="flex items-center space-x-2 cursor-pointer">
              <Star className="w-4 h-4" />
              <span>Favorites</span>
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href="/analyses" className="flex items-center space-x-2 cursor-pointer">
              <FileText className="w-4 h-4" />
              <span>My Analyses</span>
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href="/settings" className="flex items-center space-x-2 cursor-pointer">
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </a>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={handleSignOut}
            disabled={isLoading}
            className="flex items-center space-x-2 text-red-600 focus:text-red-600"
          >
            <LogOut className="w-4 h-4" />
            <span>{isLoading ? "Signing out..." : "Sign out"}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
