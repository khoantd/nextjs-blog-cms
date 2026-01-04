import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { canViewStockAnalyses } from "@/lib/auth";
import { getAppliedWorkflows } from "@/lib/workflow-utils";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user has permission to view blog posts
    if (!canViewStockAnalyses(user.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions to view blog post workflows" },
        { status: 403 }
      );
    }

    const appliedWorkflows = await getAppliedWorkflows(id);
    
    return NextResponse.json(appliedWorkflows);
  } catch (error) {
    console.error("Error fetching applied workflows:", error);
    return NextResponse.json(
      { error: "Failed to fetch applied workflows" },
      { status: 500 }
    );
  }
}
