import { prisma } from "../prisma";
import { BlogPost } from "../types";

export async function loadBlogPost(id: string): Promise<BlogPost> {
  const blogPost = await prisma.blogPost.findUnique({
    where: {
      id: parseInt(id),
    },
  });

  if (!blogPost) {
    throw new Error(`Blog post #${id} not found`);
  }

  return blogPost;
}
