"use client";
import { Editor, Provider, Sidebar } from "@inngest/workflow-kit/ui";
import { SaveIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { type Workflow } from "@/lib/types";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { updateWorkflow } from "@/app/actions";
import { actions } from "@/lib/inngest/workflowActions";

import "@inngest/workflow-kit/ui/ui.css";
import "@xyflow/react/dist/style.css";

export const AutomationEditor = ({ workflow }: { workflow: Workflow }) => {
  const router = useRouter();
  const [workflowDraft, updateWorkflowDraft] =
    useState<typeof workflow>(workflow);

  const onSaveWorkflow = useCallback(async () => {
    await updateWorkflow(workflowDraft);
    router.push("/workflows");
  }, [router, workflowDraft]);

  // Transform workflow to match expected format for Inngest UI
  const transformedWorkflow = {
    ...workflowDraft,
    created_at: workflowDraft.createdAt instanceof Date 
      ? workflowDraft.createdAt.toISOString() 
      : workflowDraft.createdAt,
  };

  // Convert database format to Inngest UI format
  const workflowData = (transformedWorkflow.workflow as any) || {};
  
  // Convert actions to steps format if needed
  const steps = workflowData.steps || workflowData.actions?.map((action: any, index: number) => ({
    id: action.id || String(index + 1),
    name: action.name || `Step ${index + 1}`,
    kind: action.kind || action.type,
    description: action.description || '',
    inputs: action.inputs || action.config || {},
  })) || [];

  // Ensure edges exist - create default edges if none exist
  const edges = workflowData.edges || [];
  
  // If we have steps but no edges, create default sequential edges
  if (steps.length > 0 && edges.length === 0) {
    // Add edge from source to first step
    edges.push({
      id: `edge-source-${steps[0].id}`,
      from: "$source",
      to: steps[0].id,
    });
    
    // Add edges between steps
    for (let i = 0; i < steps.length - 1; i++) {
      edges.push({
        id: `edge-${steps[i].id}-${steps[i + 1].id}`,
        from: steps[i].id,
        to: steps[i + 1].id,
      });
    }
  }

  // Create the workflow object expected by the UI
  const uiWorkflow = {
    name: workflowDraft.name || 'Untitled Workflow',
    description: workflowDraft.description || '',
    actions: steps,
    edges,
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Automation Editor</h2>
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{workflow.name}</CardTitle>
              <CardDescription>{workflow.description}</CardDescription>
            </div>
            <Button onClick={onSaveWorkflow}>
              <SaveIcon className="mr-2 h-4 w-4" /> Save changes
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-svh max-h-[500px]">
            <Provider
              key={workflowDraft?.id}
              workflow={uiWorkflow as any}
              trigger={{
                event: {
                  name: workflowDraft.trigger,
                },
              }}
              availableActions={actions}
              onChange={(updated) => {
                updateWorkflowDraft({
                  ...workflowDraft,
                  workflow: updated as any,
                });
              }}
            >
              <Editor>
                <Sidebar position="right" />
              </Editor>
            </Provider>
          </div>
          <CardFooter className="flex justify-end align-bottom gap-4"></CardFooter>
        </CardContent>
      </Card>
    </div>
  );
};
