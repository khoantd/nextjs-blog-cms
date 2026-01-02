import { NextRequest, NextResponse } from "next/server";
import { toggleWorkflow, deleteWorkflow } from "@/lib/workflow-creator";

/**
 * PUT /api/workflows/[id] - Enable/disable a workflow
 * DELETE /api/workflows/[id] - Delete a workflow
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const workflowId = parseInt(params.id);
    
    if (isNaN(workflowId)) {
      return NextResponse.json(
        { error: "Invalid workflow ID" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { enabled } = body;

    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: "enabled field must be a boolean" },
        { status: 400 }
      );
    }

    const workflow = await toggleWorkflow(workflowId, enabled);
    
    return NextResponse.json({ 
      message: `Workflow ${enabled ? 'enabled' : 'disabled'} successfully`, 
      workflow 
    });
  } catch (error) {
    console.error("Error updating workflow:", error);
    return NextResponse.json(
      { error: "Failed to update workflow" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const workflowId = parseInt(params.id);
    
    if (isNaN(workflowId)) {
      return NextResponse.json(
        { error: "Invalid workflow ID" },
        { status: 400 }
      );
    }

    const workflow = await deleteWorkflow(workflowId);
    
    return NextResponse.json({ 
      message: "Workflow deleted successfully", 
      workflow 
    });
  } catch (error) {
    console.error("Error deleting workflow:", error);
    return NextResponse.json(
      { error: "Failed to delete workflow" },
      { status: 500 }
    );
  }
}
