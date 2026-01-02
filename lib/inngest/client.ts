import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "workflow-kit-next-demo",
  baseUrl: process.env.INNGEST_BASE_URL || "http://localhost:8288",
});
