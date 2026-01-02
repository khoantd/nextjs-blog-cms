import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-utils";
import { canManageWorkflows, canViewWorkflows } from "@/lib/auth";

/**
 * GET /api/workflows - List all workflows
 * POST /api/workflows - Create a new workflow
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!canViewWorkflows(user.role)) {
      return NextResponse.json(
        { error: "Forbidden - Insufficient permissions to view workflows" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const enabledOnly = searchParams.get('enabled') === 'true';
    
    const workflows = await prisma.workflow.findMany({
      where: enabledOnly ? { enabled: true } : undefined,
      orderBy: { createdAt: 'desc' }
    });
    
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
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!canManageWorkflows(user.role)) {
      return NextResponse.json(
        { error: "Forbidden - Insufficient permissions to manage workflows" },
        { status: 403 }
      );
    }

    const body = await request.json();
    
    // Validate required fields
    if (!body.name || !body.trigger || !body.workflow) {
      return NextResponse.json(
        { error: "Missing required fields: name, trigger, and workflow are required" },
        { status: 400 }
      );
    }

    // Check if workflow with same name or trigger already exists
    const existingWorkflow = await prisma.workflow.findFirst({
      where: {
        OR: [
          { name: body.name },
          { trigger: body.trigger }
        ]
      }
    });

    if (existingWorkflow) {
      return NextResponse.json(
        { error: `Workflow already exists with name: ${existingWorkflow.name} or trigger: ${existingWorkflow.trigger}` },
        { status: 409 }
      );
    }

    // Create the workflow in database
    const workflow = await prisma.workflow.create({
      data: {
        name: body.name,
        description: body.description,
        trigger: body.trigger,
        workflow: body.workflow,
        enabled: body.enabled || false
      }
    });
    
    return NextResponse.json({ 
      message: "Workflow created successfully", 
      workflow 
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating workflow:", error);
    return NextResponse.json(
      { error: "Failed to create workflow" },
      { status: 500 }
    );
  }
}
