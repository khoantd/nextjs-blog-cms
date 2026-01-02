import { notFound } from "next/navigation";
import { BlogPostEditor } from "@/components/blog-post-editor";
import { loadBlogPost } from "@/lib/loaders/blog-post";

export default async function EditBlogPost({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const blogPost = await loadBlogPost(id);

  if (!blogPost) {
    return notFound();
  }

  return (
    <BlogPostEditor
      initialData={{
        id: blogPost.id,
        title: blogPost.title || "",
        subtitle: blogPost.subtitle || "",
        markdown: blogPost.markdown || "",
      }}
      isEdit={true}
    />
  );
}
