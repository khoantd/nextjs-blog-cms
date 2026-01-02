import { inngest } from "@/lib/inngest/client";
import { serve } from "inngest/next";
import blogPostWorkflow from "@/lib/inngest/workflow";

export const runtime = "nodejs";

// Standard Inngest serve pattern for Next.js App Router
// Use explicit assignment to ensure exports are properly generated
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [blogPostWorkflow],
});
