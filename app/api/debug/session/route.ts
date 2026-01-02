import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    console.log("Debug session:", session);
    
    return NextResponse.json({
      session: session,
      hasSession: !!session,
      user: session?.user,
      role: session?.user?.role,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Debug endpoint error:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
