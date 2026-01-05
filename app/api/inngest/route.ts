import { inngest } from "@/lib/inngest/client";
import { serve } from "inngest/next";
import { blogReviewWorkflow, socialMediaWorkflow, quickPublishWorkflow } from "@/lib/inngest/blog-workflows";

export const runtime = "nodejs";

// Register all workflow functions using the newer pattern
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    blogReviewWorkflow,
    socialMediaWorkflow, 
    quickPublishWorkflow
  ],
});
