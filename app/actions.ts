"use server";
import { inngest } from "@/lib/inngest/client";
import { prisma } from "@/lib/prisma";
import { type Workflow } from "@/lib/types";

export const sendBlogPostToReview = async (id: string) => {
  await prisma.blogPost.update({
    where: { id: Number(id) },
    data: {
      status: "under review",
      markdownAiRevision: null,
    },
  });

  await inngest.send({
    name: "blog-post.updated",
    data: {
      id,
    },
  });
};

export const revertBlogPostFromReview = async (id: string) => {
  await prisma.blogPost.update({
    where: { id: Number(id) },
    data: {
      status: "draft",
      markdownAiRevision: null,
    },
  });

  await inngest.send({
    name: "blog-post.updated",
    data: {
      id,
    },
  });
};

export const approveBlogPostAiSuggestions = async (id: string) => {
  console.log("Approving AI suggestions for blog post:", id);
  
  try {
    // Send the approval event to Inngest
    await inngest.send({
      name: "blog-post.approve-ai-suggestions",
      data: {
        id,
      },
    });
    
    console.log("Approval event sent successfully");
    
    // Also update the database directly as a fallback
    const blogPost = await prisma.blogPost.findUnique({
      where: { id: Number(id) }
    });
    
    if (blogPost?.markdownAiRevision) {
      await prisma.blogPost.update({
        where: { id: Number(id) },
        data: {
          markdown: blogPost.markdownAiRevision,
          markdownAiRevision: null,
          status: "published",
        },
      });
      console.log("Blog post approved and published directly");
    }
  } catch (error) {
    console.error("Failed to send approval event:", error);
    
    // Fallback: try to approve directly without Inngest
    try {
      const blogPost = await prisma.blogPost.findUnique({
        where: { id: Number(id) }
      });
      
      if (blogPost?.markdownAiRevision) {
        await prisma.blogPost.update({
          where: { id: Number(id) },
          data: {
            markdown: blogPost.markdownAiRevision,
            markdownAiRevision: null,
            status: "published",
          },
        });
        console.log("Blog post approved and published via fallback");
      } else {
        throw new Error("No AI revision found to approve");
      }
    } catch (fallbackError) {
      console.error("Fallback approval also failed:", fallbackError);
      throw new Error("Failed to approve blog post. Please try again.");
    }
  }
};

export const publishBlogPost = async (id: string) => {
  await prisma.blogPost.update({
    where: { id: Number(id) },
    data: {
      status: "published",
      markdownAiRevision: null,
    },
  });

  await inngest.send({
    name: "blog-post.published",
    data: {
      id,
    },
  });
};
export const updateWorkflow = async (workflow: Workflow) => {
  await prisma.workflow.update({
    where: { id: workflow.id },
    data: {
      workflow: workflow.workflow,
    },
  });
};

export const toggleWorkflow = async (workflowId: number, enabled: boolean) => {
  await prisma.workflow.update({
    where: { id: workflowId },
    data: {
      enabled,
    },
  });
};
