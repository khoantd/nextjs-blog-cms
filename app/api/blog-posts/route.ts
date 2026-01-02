import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const blogPosts = await prisma.blogPost.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });

  return NextResponse.json({ blogPosts });
}

export async function POST(request: Request) {
  try {
    const { title, subtitle, markdown } = await request.json();

    if (!title || !markdown) {
      return NextResponse.json(
        { error: "Title and content are required" },
        { status: 400 }
      );
    }

    const blogPost = await prisma.blogPost.create({
      data: {
        title,
        subtitle: subtitle || null,
        markdown,
        status: "draft",
      },
    });

    return NextResponse.json({ blogPost }, { status: 201 });
  } catch (error) {
    console.error("Error creating blog post:", error);
    return NextResponse.json(
      { error: "Failed to create blog post" },
      { status: 500 }
    );
  }
}
