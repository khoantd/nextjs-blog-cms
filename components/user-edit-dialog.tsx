"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useSession } from "next-auth/react";
import { UserRole } from "@/lib/types";

interface User {
  id: number;
  email: string;
  name: string | null;
  image: string | null;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

interface UserEditDialogProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserUpdated: () => void;
}

export const UserEditDialog = ({ user, open, onOpenChange, onUserUpdated }: UserEditDialogProps) => {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<UserRole>(user?.role || "viewer");

  const isCurrentUser = session?.user?.id === user?.id.toString();

  const handleSave = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update user");
      }

      onUserUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating user:", error);
      alert(error instanceof Error ? error.message : "Failed to update user");
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800";
      case "editor":
        return "bg-blue-100 text-blue-800";
      case "viewer":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update user role and permissions.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">
              Email
            </Label>
            <div className="col-span-3">
              <p className="text-sm font-medium">{user?.email}</p>
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <div className="col-span-3">
              <p className="text-sm font-medium">{user?.name || "N/A"}</p>
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="current-role" className="text-right">
              Current Role
            </Label>
            <div className="col-span-3">
              <Badge className={getRoleBadgeColor(user?.role || "viewer")}>
                {user?.role}
              </Badge>
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="role" className="text-right">
              New Role
            </Label>
            <div className="col-span-3">
              <Select
                value={role}
                onValueChange={(value) => setRole(value as UserRole)}
                disabled={isCurrentUser}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Viewer</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              {isCurrentUser && (
                <p className="text-xs text-muted-foreground mt-1">
                  You cannot change your own role
                </p>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={loading || isCurrentUser}
          >
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
