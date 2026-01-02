import { AutomationEditor } from "@/components/automation-editor";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export default async function Automation({
  params,
}: {
  params: { id: string };
}) {
  const workflow = await prisma.workflow.findUnique({
    where: { id: parseInt(params.id) }
  });
  
  if (workflow) {
    return <AutomationEditor workflow={workflow as any} />;
  } else {
    notFound();
  }
}
