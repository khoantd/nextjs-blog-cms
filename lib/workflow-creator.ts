import { prisma } from "./prisma";
import { inngest } from "./inngest/client";
import { Engine } from "@inngest/workflow-kit";
import { actionsWithHandlers } from "./inngest/workflowActionHandlers";
import { loadWorkflow } from "./loaders/workflow";

export interface CreateWorkflowParams {
  name: string;
  description?: string;
  trigger: string;
  workflow: any; // Workflow definition from @inngest/workflow-kit
  enabled?: boolean;
}

/**
 * Creates a new workflow definition and saves it to the database
 * @param params - Workflow creation parameters
 * @returns The created workflow record
 */
export async function createWorkflow(params: CreateWorkflowParams) {
  const { name, description, trigger, workflow, enabled = false } = params;

  // Validate required fields
  if (!name || !trigger || !workflow) {
    throw new Error("Missing required fields: name, trigger, and workflow are required");
  }

  // Check if workflow with same name or trigger already exists
  const existingWorkflow = await prisma.workflow.findFirst({
    where: {
      OR: [
        { name },
        { trigger }
      ]
    }
  });

  if (existingWorkflow) {
    throw new Error(`Workflow already exists with name: ${existingWorkflow.name} or trigger: ${existingWorkflow.trigger}`);
  }

  // Create the workflow in database
  const createdWorkflow = await prisma.workflow.create({
    data: {
      name,
      description,
      trigger,
      workflow,
      enabled
    }
  });

  return createdWorkflow;
}

/**
 * Creates an Inngest function from a workflow definition
 * @param workflow - The workflow record from database
 * @returns An Inngest function
 */
export function createInngestFunction(workflow: any) {
  const workflowEngine = new Engine({
    actions: actionsWithHandlers,
    loader: loadWorkflow,
  });

  return inngest.createFunction(
    { id: workflow.name },
    [{ event: workflow.trigger }],
    async ({ event, step }) => {
      await workflowEngine.run({ event, step });
    }
  );
}

/**
 * Enables or disables a workflow
 * @param workflowId - The ID of the workflow to update
 * @param enabled - Whether to enable or disable the workflow
 * @returns The updated workflow record
 */
export async function toggleWorkflow(workflowId: number, enabled: boolean) {
  const updatedWorkflow = await prisma.workflow.update({
    where: { id: workflowId },
    data: { enabled }
  });

  return updatedWorkflow;
}

/**
 * Lists all workflows
 * @param enabledOnly - Whether to return only enabled workflows
 * @returns Array of workflow records
 */
export async function listWorkflows(enabledOnly = false) {
  const workflows = await prisma.workflow.findMany({
    where: enabledOnly ? { enabled: true } : undefined,
    orderBy: { createdAt: 'desc' }
  });

  return workflows;
}

/**
 * Deletes a workflow
 * @param workflowId - The ID of the workflow to delete
 * @returns The deleted workflow record
 */
export async function deleteWorkflow(workflowId: number) {
  const deletedWorkflow = await prisma.workflow.delete({
    where: { id: workflowId }
  });

  return deletedWorkflow;
}
