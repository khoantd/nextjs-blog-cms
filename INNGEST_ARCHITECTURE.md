# Inngest Architecture Comparison & Documentation

This document explains how Inngest is integrated and works in this Next.js Blog CMS application, comparing with the reference implementation at [https://github.com/khoantd/nextjs-blog-cms](https://github.com/khoantd/nextjs-blog-cms).

## Overview

This application uses **Inngest Workflow Kit** to create dynamic, database-driven workflows that can be configured through a visual editor. The architecture follows a pattern where:

1. **Events** are sent from server actions when blog posts change state
2. **Workflow Engine** loads workflow definitions from the database
3. **Action Handlers** execute the workflow steps (AI operations, approvals, etc.)
4. **Inngest Dev Server** provides local development and debugging

## Architecture Components

### 1. Inngest Client Setup

**File:** `lib/inngest/client.ts`

```1:6:lib/inngest/client.ts
import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "workflow-kit-next-demo",
  baseUrl: process.env.INNGEST_BASE_URL || "http://localhost:8288",
});
```

**Key Points:**
- Uses Inngest SDK v3.19.14
- Configured with app ID: `"workflow-kit-next-demo"`
- Defaults to local dev server at `http://localhost:8288`
- Can be overridden with `INNGEST_BASE_URL` env variable for production
- **Event Key**: Set via `INNGEST_EVENT_KEY` for sending events in production (used by `inngest.send()`)
- **Dev Mode**: Can be forced with `INNGEST_DEV=true` environment variable
- **Note**: Signing key is configured in the API route (`serve()` function), not in the client

### 2. API Route Handler

**File:** `app/api/inngest/route.ts`

```1:17:app/api/inngest/route.ts
import { inngest } from "@/lib/inngest/client";
import { serve } from "inngest/next";
import blogPostWorkflow from "@/lib/inngest/workflow";

export const runtime = "nodejs";

// Standard Inngest serve pattern for Next.js App Router
// Use explicit assignment to ensure exports are properly generated
const handlers = serve({
  client: inngest,
  functions: [blogPostWorkflow],
});

export const GET = handlers.GET;
export const POST = handlers.POST;
export const PUT = handlers.PUT;
```

**Key Points:**
- Uses Next.js App Router API route pattern
- Exports GET, POST, and PUT handlers for Inngest communication
- Registers the `blogPostWorkflow` function
- Runtime set to `"nodejs"` for server-side execution
- **Signing Key**: Configured via `INNGEST_SIGNING_KEY` environment variable for production authentication
- In local development, signing key is optional (dev server handles it automatically)

### 3. Workflow Function Definition

**File:** `lib/inngest/workflow.ts`

```1:22:lib/inngest/workflow.ts
import { Engine } from "@inngest/workflow-kit";

import { loadWorkflow } from "../loaders/workflow";
import { inngest } from "./client";
import { actionsWithHandlers } from "./workflowActionHandlers";

const workflowEngine = new Engine({
  actions: actionsWithHandlers,
  loader: loadWorkflow,
});

export default inngest.createFunction(
  { id: "blog-post-workflow" },
  // Triggers
  // - When a blog post is set to "review"
  // - When a blog post is published
  [{ event: "blog-post.updated" }, { event: "blog-post.published" }],
  async ({ event, step }) => {
    // When `run` is called, the loader function is called with access to the event
    await workflowEngine.run({ event, step });
  }
);
```

**Key Points:**
- Uses `@inngest/workflow-kit` Engine for dynamic workflow execution
- **Triggers on events:** `blog-post.updated` and `blog-post.published`
- **Dynamic loading:** Workflows are loaded from database via `loadWorkflow` function
- **Action handlers:** All available actions are registered in `actionsWithHandlers`

### 4. Workflow Loader

**File:** `lib/loaders/workflow.ts`

```1:13:lib/loaders/workflow.ts
import { Workflow } from "@inngest/workflow-kit";
import { prisma } from "../prisma";

export async function loadWorkflow(event: { name: string }) {
  const workflow = await prisma.workflow.findFirst({
    where: {
      trigger: event.name,
      enabled: true,
    },
  });
  return workflow?.workflow as unknown as Workflow;
}
```

**Key Points:**
- **Database-driven:** Loads workflow definitions from Prisma database
- **Event matching:** Finds workflow by matching `trigger` field with event name
- **Enabled check:** Only loads workflows where `enabled: true`
- **Dynamic execution:** Allows workflows to be modified without code changes

### 5. Available Actions

**File:** `lib/inngest/workflowActions.ts`

```12:43:lib/inngest/workflowActions.ts
export const actions: PublicEngineAction[] = [
  {
    kind: "add_ToC",
    name: "Add a Table of Contents",
    description: "Add an AI-generated ToC",
  },
  {
    kind: "grammar_review",
    name: "Perform a grammar review",
    description: "Use OpenAI for grammar fixes",
  },
  {
    kind: "wait_for_approval",
    name: "Apply changes after approval",
    description: "Request approval for changes",
  },
  {
    kind: "apply_changes",
    name: "Apply changes",
    description: "Save the AI revisions",
  },
  {
    kind: "generate_linkedin_posts",
    name: "Generate LinkedIn posts",
    description: "Generate LinkedIn posts",
  },
  {
    kind: "generate_tweet_posts",
    name: "Generate Twitter posts",
    description: "Generate Twitter posts",
  },
];
```

**Key Points:**
- Defines 6 available workflow actions
- Actions are registered with the Engine and available in the visual editor
- Each action has `kind`, `name`, and `description` for UI display

### 6. Action Handlers

**File:** `lib/inngest/workflowActionHandlers.ts`

The handlers implement the actual business logic for each action:

- **`add_ToC`**: Uses LiteLLM/OpenAI to add table of contents
- **`grammar_review`**: Performs grammar fixes using AI
- **`wait_for_approval`**: Pauses workflow and waits for user approval event
- **`apply_changes`**: Applies AI revisions directly
- **`generate_linkedin_posts`**: Generates LinkedIn content
- **`generate_tweet_posts`**: Generates Twitter/X posts

**Key Pattern:**
```typescript
handler: async ({ event, step, workflowAction }) => {
  // 1. Load blog post
  const blogPost = await step.run("load-blog-post", async () =>
    loadBlogPost(event.data.id)
  );

  // 2. Perform AI operation
  const result = await step.run("ai-operation", async () => {
    // AI call using LiteLLM
  });

  // 3. Save results
  await step.run("save-results", async () => {
    // Database update
  });
}
```

**Important Features:**
- Uses `step.run()` for idempotent operations
- Uses `step.waitForEvent()` for approval workflows
- Handles AI working copy (original vs. AI revision)
- Updates blog post status throughout workflow

### 7. Event Sending

**File:** `app/actions.ts`

```30:37:app/actions.ts
  static async sendEvent(eventName: string, data: Record<string, unknown>) {
    try {
      await inngest.send({ name: eventName, data });
    } catch (error) {
      logError(error as Error, { action: 'sendEvent', eventName, data });
      throw new AppError('Failed to send workflow event', 500, 'WORKFLOW_ERROR');
    }
  }
```

**Event Triggers:**
- `blog-post.updated` - When post status changes (e.g., sent to review)
- `blog-post.published` - When post is published
- `blog-post.approve-ai-suggestions` - When user approves AI changes
- `blog-post.unpublished` - When post is unpublished

**Usage Example:**
```40:48:app/actions.ts
export const sendBlogPostToReview = async (id: string) => {
  await requireRole("editor");
  try {
    await BlogPostService.updateStatus(id, "under review");
    await BlogPostService.sendEvent("blog-post.updated", { id });
  } catch (error) {
    throw handleError(error);
  }
};
```

## Workflow Execution Flow

```
1. User Action (e.g., "Send to Review")
   ↓
2. Server Action updates database
   ↓
3. Server Action sends Inngest event (blog-post.updated)
   ↓
4. Inngest triggers workflow function
   ↓
5. Workflow Engine loads workflow from database
   ↓
6. Engine executes actions in sequence
   ↓
7. Each action handler:
   - Loads blog post
   - Performs operation (AI, approval, etc.)
   - Updates database
   ↓
8. Workflow completes or pauses (for approval)
```

## Comparison with GitHub Repository

Based on the reference implementation at [https://github.com/khoantd/nextjs-blog-cms](https://github.com/khoantd/nextjs-blog-cms), this codebase follows the same architecture:

### ✅ **Identical Patterns:**
1. **Inngest Workflow Kit** - Uses `@inngest/workflow-kit` Engine
2. **Database-driven workflows** - Workflows stored in database, loaded dynamically
3. **Event-driven triggers** - Events trigger workflows
4. **Action handlers** - Same 6 action types with similar implementations
5. **API route structure** - Same Next.js App Router pattern

### 🔄 **Potential Differences:**
1. **Enhanced error handling** - This codebase includes custom error classes
2. **Authentication** - This codebase has Google OAuth with RBAC
3. **Validation** - This codebase uses Zod schemas for input validation
4. **Service layer** - This codebase uses service classes (BlogPostService)

## Development Setup

### Local Development

```bash
# Start all services
npm run dev:all

# Or individually:
npm run dev:nextjs    # Next.js app (port 3000)
npm run dev:inngest   # Inngest dev server (port 8288)
npm run dev:prisma    # Prisma Studio (port 5555)
```

### Environment Variables

```env
# Inngest Configuration
# Local development (defaults to local dev server)
INNGEST_BASE_URL=http://localhost:8288

# Production (get from Inngest dashboard: https://app.inngest.com)
# INNGEST_BASE_URL=https://api.inngest.com
# INNGEST_EVENT_KEY=your_event_key_here  # Required for sending events in production
# INNGEST_SIGNING_KEY=your_signing_key_here  # Required for function authentication in production

# Force dev mode (optional)
# INNGEST_DEV=true

# AI Configuration
OPENAI_API_KEY=your_key
# OR
LITELLM_API_KEY=your_key
LITELLM_BASE_URL=https://your-litellm-proxy.com
OPENAI_MODEL=gpt-4o-mini
```

**Important Notes:**
- **Local Development**: No keys needed - Inngest dev server handles authentication automatically
- **Production**: You must set `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` from your Inngest dashboard
- **Event Key**: Used by the client to send events (`inngest.send()`)
- **Signing Key**: Used by the API route to authenticate function invocations from Inngest

## Key Dependencies

```json
{
  "inngest": "^3.19.14",
  "@inngest/workflow-kit": "0.1.3-alpha-20240930224141-9a7240323ec48bf95e5725173ab63ae424d76e6b",
  "inngest-cli": "^1.15.3"
}
```

## Workflow Structure

Workflows are stored in the database with this structure:
- `trigger`: Event name that starts the workflow
- `enabled`: Boolean to enable/disable workflow
- `workflow`: JSON object containing:
  - `actions`: Array of action definitions
  - `edges`: Array of connections between actions
  - `name`: Workflow name
  - `description`: Workflow description

## Best Practices

1. **Always use `step.run()`** - Ensures idempotency and retry safety
2. **Load data in steps** - Don't assume data is fresh, reload in each step
3. **Handle AI working copy** - Track original vs. AI revision properly
4. **Use `step.waitForEvent()`** - For user approvals, don't poll
5. **Error handling** - Wrap operations in try-catch with proper logging
6. **Database updates** - Update status throughout workflow for visibility

## Debugging

1. **Inngest Dev Server** - View workflow runs at `http://localhost:8288`
2. **Console logs** - Check server logs for step execution
3. **Database state** - Check `blog_posts` table for status changes
4. **Workflow runs** - View detailed execution in Inngest dashboard

## Production Deployment

1. Set `INNGEST_BASE_URL` to production Inngest URL
2. Configure Inngest Vercel integration (if using Vercel)
3. Set up Inngest event keys in environment variables
4. Ensure database migrations are run
5. Verify workflow definitions are seeded

