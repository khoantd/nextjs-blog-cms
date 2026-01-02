import { AutomationEditor } from "@/components/automation-editor";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export default async function Automation({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const workflowId = parseInt(id);
  
  // Validate that id is a valid number
  if (isNaN(workflowId)) {
    notFound();
  }
  
  const workflow = await prisma.workflow.findUnique({
    where: { id: workflowId }
  });
  
  if (workflow) {
    return <AutomationEditor workflow={workflow as any} />;
  } else {
    notFound();
  }
}
