import { notFound } from "next/navigation";
import { evaluate } from "@mdx-js/mdx";
import * as runtime from "react/jsx-runtime";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BlogPostActions } from "@/components/blog-post-actions";

import { loadBlogPost } from "@/lib/loaders/blog-post";
import { mdxComponents } from "@/lib/mdxComponents";

// Component to display JSON content
const JSONContentDisplay = ({ content }: { content: string }) => {
  try {
    const parsed = JSON.parse(content);
    return (
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-semibold mb-2">AI Generated Content:</h4>
        <pre className="text-sm bg-white p-3 rounded border overflow-auto max-h-96">
          {JSON.stringify(parsed, null, 2)}
        </pre>
      </div>
    );
  } catch {
    // If it's not valid JSON, display as plain text
    return (
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-semibold mb-2">AI Generated Content:</h4>
        <div className="bg-white p-3 rounded border">
          <pre className="text-sm whitespace-pre-wrap">{content}</pre>
        </div>
      </div>
    );
  }
};

export const revalidate = 0;

export default async function BlogPost({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  try {
    const blogPost = await loadBlogPost(id);

    if (blogPost) {
      const { default: MDXBlogPostContent } = await evaluate(
        blogPost.markdown || "",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        runtime as any
      );

      let MDXBlogPostAIContent: typeof MDXBlogPostContent | undefined;
      let showJSONContent = false;
      let jsonContent = '';

      if (
        blogPost.markdownAiRevision ||
        blogPost.aiPublishingRecommendations
      ) {
        try {
          const aiContent = blogPost.markdownAiRevision ||
            blogPost.aiPublishingRecommendations!;
            
          // Check if content looks like valid JSON
          try {
            const parsed = JSON.parse(aiContent);
            showJSONContent = true;
            jsonContent = JSON.stringify(parsed, null, 2); // Format it nicely
          } catch (jsonError) {
            // Not valid JSON, check if it contains problematic MDX patterns
            if (aiContent.includes('```') && (aiContent.includes('{') || aiContent.includes('"'))) {
              // This looks like malformed JSON mixed with markdown, show as plain text
              showJSONContent = true;
              jsonContent = aiContent;
            } else {
              // Try parsing as MDX
              try {
                MDXBlogPostAIContent = (
                  await evaluate(
                    aiContent,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    runtime as any
                  )
                ).default;
              } catch (mdxError) {
                console.error('Error parsing AI content as MDX:', mdxError);
                // Fall back to showing as plain text
                showJSONContent = true;
                jsonContent = aiContent;
              }
            }
          }
        } catch (error) {
          console.error('Error parsing AI content as MDX:', error);
          // Fall back to showing as JSON if MDX parsing fails
          const aiContent = blogPost.markdownAiRevision ||
            blogPost.aiPublishingRecommendations!;
          showJSONContent = true;
          jsonContent = aiContent;
        }
      }

      return (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Blog Post</h2>
          </div>
          <Tabs defaultValue="original">
            <Card>
              <CardHeader>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="original">Original</TabsTrigger>
                  {(MDXBlogPostAIContent || showJSONContent) && (
                    <TabsTrigger value="ai">
                      {blogPost.markdownAiRevision
                        ? "AI version"
                        : "AI Publishing recommendations"}
                    </TabsTrigger>
                  )}
                </TabsList>
              </CardHeader>
              <CardContent>
                <TabsContent value="original">
                  <MDXBlogPostContent components={mdxComponents} />
                </TabsContent>
                {(MDXBlogPostAIContent || showJSONContent) && (
                  <TabsContent value="ai">
                    {showJSONContent ? (
                      <JSONContentDisplay content={jsonContent} />
                    ) : MDXBlogPostAIContent ? (
                      <MDXBlogPostAIContent components={mdxComponents} />
                    ) : null}
                  </TabsContent>
                )}
              </CardContent>
              <CardFooter className="flex justify-end align-bottom gap-4">
                {(blogPost.status === "needs approval" || blogPost.status === "under review" || blogPost.status === "published" || blogPost.status === "draft") && (
                  <BlogPostActions id={blogPost.id.toString()} status={blogPost.status} />
                )}
              </CardFooter>
            </Card>
          </Tabs>
        </div>
      );
    } else {
      return notFound();
    }
  } catch (error) {
    console.error("Error loading blog post:", error);
    
    // Check if it's a "not found" error
    if (error instanceof Error && error.message.includes('not found')) {
      return (
        <div className="text-center py-8">
          <h2 className="text-2xl font-bold mb-4">Blog Post Not Found</h2>
          <p className="text-muted-foreground mb-4">
            The blog post you're looking for could not be found.
          </p>
          <a 
            href="/" 
            className="text-blue-600 hover:text-blue-800 underline"
          >
            Return to Home
          </a>
        </div>
      );
    }
    
    // For other errors, show a generic error message
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold mb-4">Error Loading Blog Post</h2>
        <p className="text-muted-foreground mb-4">
          There was an error loading this blog post. Please try again later.
        </p>
        <a 
          href="/" 
          className="text-blue-600 hover:text-blue-800 underline"
        >
          Return to Home
        </a>
      </div>
    );
  }
}
