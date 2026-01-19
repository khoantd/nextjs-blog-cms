import { NextRequest, NextResponse } from "next/server";
import { serverApiRequestWithCookies } from "@/lib/api-config";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { error: "Email is required", message: "Please provide an email address" },
        { status: 400 }
      );
    }

    // Forward to backend API with cookies
    const data = await serverApiRequestWithCookies(
      `/api/auth/password-status?email=${encodeURIComponent(email)}`,
      request,
      {
        method: "GET",
      }
    );

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Password status error:", error);

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
      "Failed to check password status";

    return NextResponse.json(
      { error: "Failed to check password status", message: errorMessage },
      { status: error?.status || 500 }
    );
  }
}
