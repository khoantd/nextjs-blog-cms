import { NextRequest, NextResponse } from "next/server";
import { createWorkflow, listWorkflows } from "@/lib/workflow-creator";

/**
 * GET /api/workflows - List all workflows
 * POST /api/workflows - Create a new workflow
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const enabledOnly = searchParams.get('enabled') === 'true';
    
    const workflows = await listWorkflows(enabledOnly);
    
    return NextResponse.json({ workflows });
  } catch (error) {
    console.error("Error listing workflows:", error);
    return NextResponse.json(
      { error: "Failed to list workflows" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const workflow = await createWorkflow(body);
    
    return NextResponse.json({ 
      message: "Workflow created successfully", 
      workflow 
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating workflow:", error);
    
    if (error instanceof Error && error.message.includes("already exists")) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      );
    }
    
    if (error instanceof Error && error.message.includes("Missing required fields")) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to create workflow" },
      { status: 500 }
    );
  }
}
