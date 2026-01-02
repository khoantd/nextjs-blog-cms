import { inngest } from "@/lib/inngest/client";
import { serve } from "inngest/next";
import { prisma } from "@/lib/prisma";
import { loadBlogPost } from "@/lib/loaders/blog-post";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env["LITELLM_BASE_URL"] ? process.env["LITELLM_API_KEY"] : process.env["OPENAI_API_KEY"],
  baseURL: process.env["LITELLM_BASE_URL"] || undefined,
});

export const runtime = "nodejs";

const blogPostWorkflow = inngest.createFunction(
  { id: "blog-post-workflow" },
  [{ event: "blog-post.updated" }, { event: "blog-post.published" }],
  async ({ event, step }) => {
    const blogPost = await step.run("load-blog-post", async () =>
      loadBlogPost(event.data.id)
    );

    const aiRevision = await step.run("add-toc-to-article", async () => {
      const prompt = `
      Please update the below markdown article by adding a Table of Content under the h1 title. Return only the complete updated article in markdown without the wrapping "\`\`\`".

      Here is the text wrapped with "\`\`\`":
      \`\`\`
      ${blogPost.markdown}
      \`\`\`
      `;

      const response = await openai.chat.completions.create({
        model: process.env["OPENAI_MODEL"] || "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an AI that make text editing changes.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      return response.choices[0]?.message?.content || "";
    });

    await step.run("save-ai-revision", async () => {
      await prisma.blogPost.update({
        where: { id: parseInt(event.data.id) },
        data: {
          markdownAiRevision: aiRevision,
          status: "under review",
        }
      });
    });
  }
);

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [blogPostWorkflow],
});
