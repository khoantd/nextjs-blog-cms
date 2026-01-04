"use client";
import { useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import useSWR, { useSWRConfig } from "swr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserEditDialog } from "./user-edit-dialog";
import { Search, Edit, Trash2, Users } from "lucide-react";
import { UserRole } from "@/lib/types";
import { canViewUsers } from "@/lib/client-auth";

interface User {
  id: number;
  email: string;
  name: string | null;
  image: string | null;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

interface UsersResponse {
  data: {
    users: User[];
  };
}

export const UserList = () => {
  const { data: session } = useSession();
  const { mutate } = useSWRConfig();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<User | null>(null);

  // Build query parameters
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.set("search", searchTerm);
    if (roleFilter !== "all") params.set("role", roleFilter);
    return params.toString();
  }, [searchTerm, roleFilter]);

  // Fetch users with SWR
  const { data: usersData, error } = useSWR<UsersResponse>(
    session && canViewUsers(session.user.role) ? `/api/users?${queryParams}` : null
  );

  const users = usersData?.data?.users || [];

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setEditDialogOpen(true);
  };

  const handleDeleteUser = async (user: User) => {
    if (!confirm(`Are you sure you want to delete ${user.email}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete user");
      }

      // Refresh the users list
      mutate(`/api/users?${queryParams}`);
    } catch (error) {
      console.error("Error deleting user:", error);
      alert(error instanceof Error ? error.message : "Failed to delete user");
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

  const isCurrentUser = (userId: number) => {
    return session?.user?.id === userId.toString();
  };

  if (!session || !canViewUsers(session.user.role)) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            You don't have permission to view users.
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-destructive">
            Error loading users. Please try again.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      {searchTerm || roleFilter !== "all"
                        ? "No users found matching your filters."
                        : "No users found."}
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                            {user.image ? (
                              <img
                                src={user.image}
                                alt={user.name || user.email}
                                className="w-8 h-8 rounded-full"
                              />
                            ) : (
                              <span className="text-xs font-medium">
                                {(user.name || user.email).charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="font-medium">
                              {user.name || "N/A"}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getRoleBadgeColor(user.role)}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditUser(user)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteUser(user)}
                            disabled={isCurrentUser(user.id)}
                            className={isCurrentUser(user.id) ? "opacity-50" : ""}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <UserEditDialog
        user={editingUser}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onUserUpdated={() => mutate(`/api/users?${queryParams}`)}
      />
    </div>
  );
};
