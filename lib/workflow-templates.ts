export interface WorkflowStep {
  id: string;
  kind: string;
  name: string;
}

export interface WorkflowTemplate {
  name: string;
  description: string;
  trigger: string;
  steps: WorkflowStep[];
}

export const workflowTemplates: WorkflowTemplate[] = [
  {
    name: "blog-review-workflow",
    description: "Automated blog post review with AI assistance",
    trigger: "blog-post.created",
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
  },
  {
    name: "social-media-workflow",
    description: "Generate social media content for published posts",
    trigger: "blog-post.published",
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
  },
  {
    name: "quick-publish-workflow",
    description: "Fast-track workflow for urgent posts",
    trigger: "blog-post.urgent",
    steps: [
      {
        id: "1",
        kind: "grammar_review",
        name: "Quick Grammar Review"
      },
      {
        id: "2",
        kind: "apply_changes",
        name: "Apply Changes"
      }
    ]
  }
];

export const availableActions = [
  { kind: "add_ToC", name: "Add Table of Contents", description: "Add an AI-generated ToC" },
  { kind: "grammar_review", name: "Grammar Review", description: "Use OpenAI for grammar fixes" },
  { kind: "wait_for_approval", name: "Wait for Approval", description: "Request approval for changes" },
  { kind: "apply_changes", name: "Apply Changes", description: "Save the AI revisions" },
  { kind: "generate_linkedin_posts", name: "Generate LinkedIn Posts", description: "Generate LinkedIn posts" },
  { kind: "generate_tweet_posts", name: "Generate Twitter Posts", description: "Generate Twitter posts" }
];

export function getWorkflowTemplate(templateName: string): WorkflowTemplate | undefined {
  return workflowTemplates.find(template => template.name === templateName);
}

export function formatWorkflowAsJson(template: WorkflowTemplate): string {
  return JSON.stringify({
    steps: template.steps
  }, null, 2);
}
