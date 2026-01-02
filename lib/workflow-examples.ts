import { createWorkflow } from "@/lib/workflow-creator";

/**
 * Example: Create a new workflow for blog post review
 */
export async function createBlogReviewWorkflow() {
  const workflowDefinition = {
    // Define your workflow steps here
    steps: [
      {
        id: "1",
        kind: "add_ToC",
        name: "Add Table of Contents"
      },
      {
        id: "2", 
        kind: "grammar_review",
        name: "Grammar Review"
      },
      {
        id: "3",
        kind: "wait_for_approval", 
        name: "Wait for Approval"
      }
    ]
  };

  try {
    const workflow = await createWorkflow({
      name: "blog-review-workflow",
      description: "Automated blog post review with AI assistance",
      trigger: "blog-post.created",
      workflow: workflowDefinition,
      enabled: true
    });

    console.log("Workflow created:", workflow);
    return workflow;
  } catch (error) {
    console.error("Failed to create workflow:", error);
    throw error;
  }
}

/**
 * Example: Create a social media workflow
 */
export async function createSocialMediaWorkflow() {
  const workflowDefinition = {
    steps: [
      {
        id: "1",
        kind: "generate_linkedin_posts",
        name: "Generate LinkedIn Posts"
      },
      {
        id: "2",
        kind: "generate_tweet_posts", 
        name: "Generate Twitter Posts"
      }
    ]
  };

  try {
    const workflow = await createWorkflow({
      name: "social-media-workflow",
      description: "Generate social media content for published posts",
      trigger: "blog-post.published",
      workflow: workflowDefinition,
      enabled: false // Disabled by default
    });

    console.log("Social media workflow created:", workflow);
    return workflow;
  } catch (error) {
    console.error("Failed to create social media workflow:", error);
    throw error;
  }
}
