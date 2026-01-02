"use server";
import { inngest } from "@/lib/inngest/client";
import { prisma } from "@/lib/prisma";
import { type BlogPost, type Workflow } from "@/lib/types";
import { AppError, DatabaseError, handleError, logError } from "@/lib/errors";
import { validateInput, blogPostIdSchema } from "@/lib/validation";
import { z } from "zod";
import { requireRole } from "@/lib/auth-utils";

// Base class for blog post operations
class BlogPostService {
  static async updateStatus(id: string, status: string, additionalData: Record<string, unknown> = {}) {
    try {
      const validatedId = validateInput(blogPostIdSchema, id);
      
      return await prisma.blogPost.update({
        where: { id: Number(validatedId) },
        data: {
          status,
          markdownAiRevision: null,
          ...additionalData,
        },
      });
    } catch (error) {
      logError(error as Error, { action: 'updateStatus', id, status });
      throw new DatabaseError('Failed to update blog post status', error as Error);
    }
  }

  static async sendEvent(eventName: string, data: Record<string, unknown>) {
    try {
      await inngest.send({ name: eventName, data });
    } catch (error) {
      logError(error as Error, { action: 'sendEvent', eventName, data });
      throw new AppError('Failed to send workflow event', 500, 'WORKFLOW_ERROR');
    }
  }
}

export const sendBlogPostToReview = async (id: string) => {
  await requireRole("editor");
  try {
    await BlogPostService.updateStatus(id, "under review");
    await BlogPostService.sendEvent("blog-post.updated", { id });
  } catch (error) {
    throw handleError(error);
  }
};

export const revertBlogPostFromReview = async (id: string) => {
  await requireRole("editor");
  try {
    await BlogPostService.updateStatus(id, "draft");
    // Don't send event for revert to draft - no automation needed
  } catch (error) {
    throw handleError(error);
  }
};

export const approveBlogPostAiSuggestions = async (id: string) => {
  await requireRole("editor");
  console.log("Approving AI suggestions for blog post:", id);
  
  let validatedId: string | undefined;
  
  try {
    validatedId = validateInput(blogPostIdSchema, id);
    
    // Send the approval event to Inngest
    await BlogPostService.sendEvent("blog-post.approve-ai-suggestions", { id: validatedId });
    console.log("Approval event sent successfully");
    
    // Also update the database directly as a fallback
    const blogPost = await prisma.blogPost.findUnique({
      where: { id: Number(validatedId) }
    });
    
    if (blogPost?.markdownAiRevision) {
      await BlogPostService.updateStatus(validatedId, "published", {
        markdown: blogPost.markdownAiRevision as string,
      });
      console.log("Blog post approved and published directly");
    } else {
      throw new AppError("No AI revision found to approve", 404, "NO_REVISION_FOUND");
    }
  } catch (error) {
    logError(error as Error, { action: 'approveBlogPostAiSuggestions', id });
    
    // Fallback: try to approve directly without Inngest
    try {
      if (!validatedId) {
        validatedId = validateInput(blogPostIdSchema, id);
      }
      
      const blogPost = await prisma.blogPost.findUnique({
        where: { id: Number(validatedId) }
      });
      
      if (blogPost?.markdownAiRevision) {
        await BlogPostService.updateStatus(validatedId, "published", {
          markdown: blogPost.markdownAiRevision as string,
        });
        console.log("Blog post approved and published via fallback");
      } else {
        throw new AppError("No AI revision found to approve", 404, "NO_REVISION_FOUND");
      }
    } catch (fallbackError) {
      logError(fallbackError as Error, { action: 'approveBlogPostAiSuggestions_fallback', id: validatedId || id });
      throw new AppError("Failed to approve blog post. Please try again.", 500, "APPROVAL_FAILED");
    }
  }
};

export const publishBlogPost = async (id: string) => {
  await requireRole("editor");
  try {
    await BlogPostService.updateStatus(id, "published");
    await BlogPostService.sendEvent("blog-post.published", { id });
  } catch (error) {
    throw handleError(error);
  }
};

export const unpublishBlogPost = async (id: string) => {
  await requireRole("editor");
  try {
    await BlogPostService.updateStatus(id, "draft");
    await BlogPostService.sendEvent("blog-post.unpublished", { id });
  } catch (error) {
    throw handleError(error);
  }
};
export const updateWorkflow = async (workflow: Workflow) => {
  await requireRole("editor");
  try {
    await prisma.workflow.update({
      where: { id: workflow.id },
      data: {
        workflow: workflow.workflow as any,
      },
    });
  } catch (error) {
    logError(error as Error, { action: 'updateWorkflow', workflowId: workflow.id });
    throw new DatabaseError('Failed to update workflow', error as Error);
  }
};

export const toggleWorkflow = async (workflowId: number, enabled: boolean) => {
  await requireRole("editor");
  try {
    await prisma.workflow.update({
      where: { id: workflowId },
      data: {
        enabled,
      },
    });
  } catch (error) {
    logError(error as Error, { action: 'toggleWorkflow', workflowId, enabled });
    throw new DatabaseError('Failed to toggle workflow', error as Error);
  }
};

// Validation schema for user role updates
const userRoleUpdateSchema = z.object({
  email: z.string().email(),
  role: z.enum(['viewer', 'editor', 'admin'])
});

// User management service class
class UserService {
  static async updateUserRole(email: string, role: 'viewer' | 'editor' | 'admin') {
    try {
      const validatedData = validateInput(userRoleUpdateSchema, { email, role });
      
      const updatedUser = await prisma.user.update({
        where: { email: validatedData.email },
        data: { role: validatedData.role },
        select: { id: true, email: true, name: true, role: true }
      });
      
      return updatedUser;
    } catch (error) {
      logError(error as Error, { action: 'updateUserRole', email, role });
      throw new DatabaseError('Failed to update user role', error as Error);
    }
  }
}

export const updateUserRole = async (email: string, role: 'viewer' | 'editor' | 'admin') => {
  await requireRole("admin");
  try {
    return await UserService.updateUserRole(email, role);
  } catch (error) {
    throw handleError(error);
  }
};
