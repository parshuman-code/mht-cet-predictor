import { NextRequest, NextResponse } from "next/server";
import { getLocalBackendBaseUrl } from "@/lib/api";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

async function proxyBackendRequest(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  const targetUrl = new URL(`${getLocalBackendBaseUrl()}/${path.join("/")}`);
  targetUrl.search = request.nextUrl.search;

  const method = request.method;
  const hasBody = !["GET", "HEAD"].includes(method);

  try {
    const response = await fetch(targetUrl, {
      method,
      headers: {
        accept: request.headers.get("accept") || "application/json",
        "content-type": request.headers.get("content-type") || "application/json",
      },
      body: hasBody ? await request.text() : undefined,
      cache: "no-store",
    });

    const contentType = response.headers.get("content-type") || "application/json";
    return new NextResponse(await response.text(), {
      status: response.status,
      headers: { "content-type": contentType },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to reach backend";
    return NextResponse.json(
      {
        status: "error",
        message: `Backend proxy failed: ${message}. Make sure FastAPI is running on ${getLocalBackendBaseUrl()}.`,
      },
      { status: 502 }
    );
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  return proxyBackendRequest(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return proxyBackendRequest(request, context);
}
