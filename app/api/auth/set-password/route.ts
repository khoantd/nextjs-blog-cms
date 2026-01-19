import { NextRequest, NextResponse } from "next/server";
import { serverApiRequestWithCookies } from "@/lib/api-config";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Forward to backend API with cookies
    const data = await serverApiRequestWithCookies(
      "/api/auth/set-password",
      request,
      {
        method: "POST",
        body: JSON.stringify(body),
      }
    );

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Set password error:", error);

    // Handle connection errors gracefully
    const isConnectionError = (error as any)?.isConnectionError || false;
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://72.60.233.159:3050";

    if (isConnectionError) {
      return NextResponse.json(
        {
          error: "Backend connection failed",
          message: `Cannot connect to backend at ${backendUrl}`,
          backendUrl,
        },
        { status: 503 }
      );
    }

    // Extract error message from backend response
    const errorMessage =
      error?.details?.message ||
      error?.details?.error ||
      error?.message ||
      "Failed to set password";

    return NextResponse.json(
      { error: "Failed to set password", message: errorMessage },
      { status: error?.status || 500 }
    );
  }
}
