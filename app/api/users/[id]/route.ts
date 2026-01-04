import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { canManageUsers } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!canManageUsers(user.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions to manage users" },
        { status: 403 }
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: parseInt(params.id) },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: { user: targetUser } });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!canManageUsers(currentUser.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions to manage users" },
        { status: 403 }
      );
    }

    const { role } = await request.json();

    if (!role || !["viewer", "editor", "admin"].includes(role)) {
      return NextResponse.json(
        { error: "Valid role is required" },
        { status: 400 }
      );
    }

    // Prevent changing own role
    if (parseInt(currentUser.id) === parseInt(params.id)) {
      return NextResponse.json(
        { error: "Cannot change your own role" },
        { status: 400 }
      );
    }

    // Check if this is the last admin user
    if (role !== "admin") {
      const targetUser = await prisma.user.findUnique({
        where: { id: parseInt(params.id) },
        select: { role: true },
      });

      if (targetUser?.role === "admin") {
        const adminCount = await prisma.user.count({
          where: { role: "admin" },
        });

        if (adminCount <= 1) {
          return NextResponse.json(
            { error: "Cannot demote the last admin user" },
            { status: 400 }
          );
        }
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: parseInt(params.id) },
      data: { role },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ data: { user: updatedUser } });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!canManageUsers(currentUser.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions to manage users" },
        { status: 403 }
      );
    }

    // Prevent deleting self
    if (parseInt(currentUser.id) === parseInt(params.id)) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      );
    }

    // Check if this is the last admin user
    const targetUser = await prisma.user.findUnique({
      where: { id: parseInt(params.id) },
      select: { role: true },
    });

    if (targetUser?.role === "admin") {
      const adminCount = await prisma.user.count({
        where: { role: "admin" },
      });

      if (adminCount <= 1) {
        return NextResponse.json(
          { error: "Cannot delete the last admin user" },
          { status: 400 }
        );
      }
    }

    await prisma.user.delete({
      where: { id: parseInt(params.id) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
