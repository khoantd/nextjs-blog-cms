import { inngest } from "./client";
import { completion } from "../litellm-proxy";
import { loadBlogPost } from "../loaders/blog-post";
import { prisma } from "../prisma";

// Helper to get the working copy for AI processing
function getAIworkingCopy(blogPost: any) {
  return blogPost.markdownAiRevision || blogPost.markdown;
}

// Blog Review Workflow - Adds ToC, Grammar Review, and waits for approval
export const blogReviewWorkflow = inngest.createFunction(
  { id: "blog-review-workflow" },
  { event: "blog-post.updated" },
  async ({ event, step }) => {
    const { blogPostId, workflowName } = event.data;
    
    console.log(`🔄 Starting blog review workflow for post ${blogPostId}`);
    
    // Step 1: Add Table of Contents
    const blogPost = await step.run("load-blog-post", async () => {
      return await loadBlogPost(blogPostId);
    });

    const tocRevision = await step.run("add-table-of-contents", async () => {
      const prompt = `
Please update the below markdown article by adding a Table of Content under the h1 title. Return only the complete updated article in markdown without the wrapping "\`\`\`".

Here is the text wrapped with "\`\`\`":
\`\`\`
${blogPost.markdown}
\`\`\`
`;

      const response = await completion({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
      });

      return response.choices[0]?.message?.content || blogPost.markdown;
    });

    await step.run("save-toc-revision", async () => {
      await prisma.blogPost.update({
        where: { id: Number(blogPostId) },
        data: { 
          markdownAiRevision: tocRevision,
          status: "needs approval"
        }
      });
    });

    // Step 2: Grammar Review
    const grammarRevision = await step.run("grammar-review", async () => {
      const prompt = `
Please review and fix any grammar issues in the below markdown article. Return only the corrected article in markdown without the wrapping "\`\`\`".

Here is the text wrapped with "\`\`\`":
\`\`\`
${tocRevision}
\`\`\`
`;

      const response = await completion({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
      });

      return response.choices[0]?.message?.content || tocRevision;
    });

    await step.run("save-grammar-revision", async () => {
      await prisma.blogPost.update({
        where: { id: Number(blogPostId) },
        data: { 
          markdownAiRevision: grammarRevision,
          status: "needs approval"
        }
      });
    });

    console.log(`✅ Blog review workflow completed for post ${blogPostId}`);
    return { success: true, message: "Blog review workflow completed" };
  }
);

// Social Media Workflow - Generates social media content
export const socialMediaWorkflow = inngest.createFunction(
  { id: "social-media-workflow" },
  { event: "blog-post.published" },
  async ({ event, step }) => {
    const { blogPostId, workflowName } = event.data;
    
    console.log(`🔄 Starting social media workflow for post ${blogPostId}`);
    
    const blogPost = await step.run("load-blog-post", async () => {
      return await loadBlogPost(blogPostId);
    });

    // Generate LinkedIn Posts
    const linkedinContent = await step.run("generate-linkedin-posts", async () => {
      const prompt = `
Generate 3 LinkedIn post variations based on this blog post. Each post should:
- Be engaging and professional
- Include relevant hashtags
- Be under 300 characters
- End with a call to action

Blog post content:
${blogPost.markdown}

Return as JSON format:
{
  "posts": [
    "Post 1 text here",
    "Post 2 text here", 
    "Post 3 text here"
  ]
}
`;

      const response = await completion({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      });

      return response.choices[0]?.message?.content || '{"posts": []}';
    });

    // Generate Twitter Posts
    const twitterContent = await step.run("generate-twitter-posts", async () => {
      const prompt = `
Generate 3 Twitter post variations based on this blog post. Each post should:
- Be under 280 characters
- Include relevant hashtags
- Be engaging and concise
- Include a call to action

Blog post content:
${blogPost.markdown}

Return as JSON format:
{
  "posts": [
    "Tweet 1 text here",
    "Tweet 2 text here",
    "Tweet 3 text here"
  ]
}
`;

      const response = await completion({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      });

      return response.choices[0]?.message?.content || '{"posts": []}';
    });

    // Save social media content as AI publishing recommendations
    await step.run("save-social-media-content", async () => {
      const socialMediaContent = `
## Social Media Content Generated

### LinkedIn Posts:
${linkedinContent}

### Twitter Posts:
${twitterContent}
`;

      await prisma.blogPost.update({
        where: { id: Number(blogPostId) },
        data: { 
          aiPublishingRecommendations: socialMediaContent,
          status: "published"
        }
      });
    });

    console.log(`✅ Social media workflow completed for post ${blogPostId}`);
    return { success: true, message: "Social media workflow completed" };
  }
);

// Quick Publish Workflow - Fast grammar review and apply
export const quickPublishWorkflow = inngest.createFunction(
  { id: "quick-publish-workflow" },
  { event: "blog-post.updated" },
  async ({ event, step }) => {
    const { blogPostId, workflowName } = event.data;
    
    console.log(`🔄 Starting quick publish workflow for post ${blogPostId}`);
    
    const blogPost = await step.run("load-blog-post", async () => {
      return await loadBlogPost(blogPostId);
    });

    // Quick Grammar Review
    const grammarRevision = await step.run("quick-grammar-review", async () => {
      const prompt = `
Quickly review and fix any critical grammar issues in the below markdown article. Focus on:
- Spelling errors
- Basic grammar mistakes
- Clear sentence structure

Return only the corrected article in markdown without the wrapping "\`\`\`".

Here is the text wrapped with "\`\`\`":
\`\`\`
${blogPost.markdown}
\`\`\`
`;

      const response = await completion({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
      });

      return response.choices[0]?.message?.content || blogPost.markdown;
    });

    // Apply changes immediately (no approval needed)
    await step.run("apply-changes", async () => {
      await prisma.blogPost.update({
        where: { id: Number(blogPostId) },
        data: { 
          markdown: grammarRevision,
          status: "published"
        }
      });
    });

    console.log(`✅ Quick publish workflow completed for post ${blogPostId}`);
    return { success: true, message: "Quick publish workflow completed" };
  }
);
