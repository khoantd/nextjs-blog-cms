import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { canViewPosts } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user has permission to view blog posts
    if (!canViewPosts(user.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions to view posts" },
        { status: 403 }
      );
    }

    // Validate ID
    const parsedId = parseInt(id);
    if (isNaN(parsedId) || parsedId <= 0) {
      return NextResponse.json(
        { error: "Invalid blog post ID" },
        { status: 400 }
      );
    }

    const blogPost = await prisma.blogPost.findUnique({
      where: {
        id: parsedId,
      },
    });

    if (!blogPost) {
      return NextResponse.json(
        { error: "Blog post not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: { blogPost } });
  } catch (error) {
    console.error("Error fetching blog post:", error);
    return NextResponse.json(
      { error: "Failed to fetch blog post" },
      { status: 500 }
    );
  }
}
