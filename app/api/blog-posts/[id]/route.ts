import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { title, subtitle, markdown } = await request.json();

    if (!title || !markdown) {
      return NextResponse.json(
        { error: "Title and content are required" },
        { status: 400 }
      );
    }

    const blogPost = await prisma.blogPost.update({
      where: { id: Number(id) },
      data: {
        title,
        subtitle: subtitle || null,
        markdown,
      },
    });

    return NextResponse.json({ blogPost });
  } catch (error) {
    console.error("Error updating blog post:", error);
    return NextResponse.json(
      { error: "Failed to update blog post" },
      { status: 500 }
    );
  }
}
