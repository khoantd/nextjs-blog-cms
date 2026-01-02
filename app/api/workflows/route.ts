import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const workflows = await prisma.workflow.findMany({
    orderBy: {
      id: "asc",
    },
  });

  return NextResponse.json({ workflows });
}
