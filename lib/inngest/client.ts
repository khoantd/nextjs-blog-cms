import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "workflow-kit-next-demo",
  // Base URL for Inngest API (defaults to local dev server)
  baseUrl: process.env.INNGEST_BASE_URL || "http://localhost:8288",
  // Event key for sending events (required for production)
  eventKey: process.env.INNGEST_EVENT_KEY,
  // Signing key for authentication
  signingKey: process.env.INNGEST_SIGNING_KEY,
  // Force dev mode to disable strict signature validation
  isDev: true,
});
