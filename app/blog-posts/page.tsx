import { requireAuth } from "@/lib/auth-utils";
import { BlogPostList } from "@/components/blog-post-list";

export default async function BlogPostsPage() {
  await requireAuth();
  return <BlogPostList />;
}
