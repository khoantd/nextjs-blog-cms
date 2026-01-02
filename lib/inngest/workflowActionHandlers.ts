import { type EngineAction, type WorkflowAction } from "@inngest/workflow-kit";
import { completion } from "litellm";

import { type BlogPost } from "../types";

import { loadBlogPost } from "../loaders/blog-post";
import { prisma } from "../prisma";
import { actions } from "./workflowActions";
import { inngest } from "./client";

// helper to ensure that each step of the workflow use
//  the original content or current AI revision
function getAIworkingCopy(workflowAction: WorkflowAction, blogPost: BlogPost) {
  return workflowAction.id === "1" // the first action of the workflow gets assigned id: "1"
    ? blogPost.markdown // if we are the first action, we use the initial content
    : blogPost.markdownAiRevision || blogPost.markdown; // otherwise we use the previous current ai revision
}

// helper to ensure that each step of the workflow use
//  the original content or current AI revision
function addAiPublishingSuggestion(
  workflowAction: WorkflowAction,
  blogPost: BlogPost,
  additionalSuggestion: string
) {
  return workflowAction.id === "1" // the first action of the workflow gets assigned id: "1"
    ? additionalSuggestion // if we are the first action, we reset the suggestions
    : (blogPost.aiPublishingRecommendations || "") + `<br/ >` + additionalSuggestion; // otherwise add one
}

export const actionsWithHandlers: EngineAction<typeof inngest>[] = [
  {
    // Add a Table of Contents
    ...actions[0],
    handler: async ({ event, step, workflowAction }) => {
      const blogPost = await step.run("load-blog-post", async () =>
        loadBlogPost(event.data.id)
      );

      const aiRevision = await step.run("add-toc-to-article", async () => {
        const prompt = `
        Please update the below markdown article by adding a Table of Content under the h1 title. Return only the complete updated article in markdown without the wrapping "\`\`\`".

        Here is the text wrapped with "\`\`\`":
        \`\`\`
        ${getAIworkingCopy(workflowAction, blogPost)}
        \`\`\`
        `;

        const response = await completion({
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
          apiKey: process.env["LITELLM_API_KEY"] || process.env["OPENAI_API_KEY"],
          baseUrl: process.env["LITELLM_BASE_URL"],
        });

        return response.choices[0]?.message?.content || "";
      });

      await step.run("save-ai-revision", async () => {
        await prisma.blogPost.update({
          where: { id: BigInt(event.data.id) as any },
          data: {
            markdownAiRevision: aiRevision,
            status: "under review",
          },
        });
      });
    },
  },
  {
    // Perform a grammar review
    ...actions[1],
    handler: async ({ event, step, workflowAction }) => {
      const blogPost = await step.run("load-blog-post", async () =>
        loadBlogPost(event.data.id)
      );

      const aiRevision = await step.run("get-ai-grammar-fixes", async () => {
        const prompt = `
        You are my "Hemmingway editor" AI. Please update the below article with some grammar fixes. Return only the complete updated article in markdown without the wrapping "\`\`\`".

        Here is the text wrapped with "\`\`\`":
        \`\`\`
        ${getAIworkingCopy(workflowAction, blogPost)}
        \`\`\`
        `;

        const response = await completion({
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
          apiKey: process.env["LITELLM_API_KEY"] || process.env["OPENAI_API_KEY"],
          baseUrl: process.env["LITELLM_BASE_URL"],
        });

        return response.choices[0]?.message?.content || "";
      });

      await step.run("save-ai-revision", async () => {
        await prisma.blogPost.update({
          where: { id: BigInt(event.data.id) as any },
          data: {
            markdownAiRevision: aiRevision,
            status: "under review",
          },
        });
      });
    },
  },
  {
    // Apply changes after approval
    ...actions[2],
    handler: async ({ event, step }) => {
      const blogPost = await step.run("load-blog-post", async () =>
        loadBlogPost(event.data.id)
      );

      await step.run("update-blog-post-status", async () => {
        await prisma.blogPost.update({
          where: { id: BigInt(event.data.id) as any },
          data: {
            status: "needs approval",
          },
        });
      });

      // wait for the user to approve or discard the AI suggestions
      const approval = await step.waitForEvent(
        "wait-for-ai-suggestion-approval",
        {
          event: "blog-post.approve-ai-suggestions",
          timeout: "1d",
          match: "data.id",
        }
      );

      // without action from the user within 1 day, the AI suggestions are discarded
      if (!approval) {
        await step.run("discard-ai-revision", async () => {
          await prisma.blogPost.update({
            where: { id: BigInt(event.data.id) as any },
            data: {
              markdownAiRevision: null,
              status: "draft",
            },
          });
        });
      } else {
        await step.run("apply-ai-revision", async () => {
          await prisma.blogPost.update({
            where: { id: blogPost.id },
            data: {
              markdown: blogPost.markdownAiRevision,
              markdownAiRevision: null,
              status: "published",
            },
          });
        });
      }
    },
  },
  {
    // Apply changes
    ...actions[3],
    handler: async ({ event, step }) => {
      const blogPost = await step.run("load-blog-post", async () =>
        loadBlogPost(event.data.id)
      );

      await step.run("apply-ai-revision", async () => {
        await prisma.blogPost.update({
          where: { id: blogPost.id },
          data: {
            markdown: blogPost.markdownAiRevision,
            markdownAiRevision: null,
            status: "published",
          },
        });
      });
    },
  },
  {
    // Generate LinkedIn posts
    ...actions[4],
    handler: async ({ event, step, workflowAction }) => {
      const blogPost = await step.run("load-blog-post", async () =>
        loadBlogPost(event.data.id)
      );

      const aiRecommendations = await step.run(
        "generate-linked-posts",
        async () => {
          const prompt = `
          Generate a LinkedIn post that will drive traffic to the below blog post.
          Keep the a profesionnal tone, do not use emojis.

          Here is the blog post text wrapped with "\`\`\`":
          \`\`\`
          ${getAIworkingCopy(workflowAction, blogPost)}
          \`\`\`
          `;

          const response = await completion({
            model: process.env["OPENAI_MODEL"] || "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: "You are an Developer Marketing expert.",
              },
              {
                role: "user",
                content: prompt,
              },
            ],
            apiKey: process.env["LITELLM_API_KEY"] || process.env["OPENAI_API_KEY"],
            baseUrl: process.env["LITELLM_BASE_URL"],
          });

          return response.choices[0]?.message?.content || "";
        }
      );

      await step.run("save-ai-recommendations", async () => {
        await prisma.blogPost.update({
          where: { id: BigInt(event.data.id) as any },
          data: {
            aiPublishingRecommendations: addAiPublishingSuggestion(
              workflowAction,
              blogPost,
              `\n## LinkedIn posts: \n <br/ >${aiRecommendations}<br/ >`
            ),
          },
        });
      });
    },
  },
  {
    // Generate Twitter posts
    ...actions[5],
    handler: async ({ event, step, workflowAction }) => {
      const numberOfTweets = 2;
      const blogPost = await step.run("load-blog-post", async () =>
        loadBlogPost(event.data.id)
      );

      const aiRecommendations = await step.run("generate-tweets", async () => {
        const prompt = `
        Generate ${numberOfTweets} tweets to announce the blog post.
        Keep the tone friendly, feel free to use emojis, and, if relevant, use bullet points teasing the main takeaways of the blog post.
        Prefix each tweet with "----- Tweet number {tweet number} ----- <br/>"

        Here is the blog post text wrapped with "\`\`\`":
        \`\`\`
        ${blogPost.markdown}
        \`\`\`
        `;

        const response = await completion({
          model: process.env["OPENAI_MODEL"] || "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are an Developer Marketing expert.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          apiKey: process.env["LITELLM_API_KEY"] || process.env["OPENAI_API_KEY"],
          baseUrl: process.env["LITELLM_BASE_URL"],
        });

        return response.choices[0]?.message?.content || "";
      });

      await step.run("save-ai-recommendations", async () => {
        await prisma.blogPost.update({
          where: { id: BigInt(event.data.id) as any },
          data: {
            aiPublishingRecommendations: addAiPublishingSuggestion(
              workflowAction,
              blogPost,
              `\n## Twitter posts: \n <br/ >${aiRecommendations}<br/ >`
            ),
          },
        });
      });
    },
  },
];
