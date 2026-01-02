import { requireAuth, requireRole } from "@/lib/auth-utils";
import UnifiedAutomationManager from "@/components/unified-automation-manager";

export default async function WorkflowsPage() {
  const user = await requireAuth();
  console.log("User accessing workflows:", { id: user.id, email: user.email, role: user.role });
  await requireRole("editor"); // Only editors and admins can manage workflows
  return <UnifiedAutomationManager />;
}
