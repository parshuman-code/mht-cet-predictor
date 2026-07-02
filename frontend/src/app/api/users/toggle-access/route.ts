import { NextResponse } from "next/server";
import { currentUser, clerkClient } from "@clerk/nextjs/server";

export async function POST(req: Request) {
  try {
    // 1. Verify admin
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const email = user.emailAddresses[0]?.emailAddress;
    if (email !== "prashantgadwe142006@gmail.com") {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
    }

    // 2. Parse request body
    const body = await req.json();
    const { userId, isAllowed } = body;

    if (!userId || typeof isAllowed !== "boolean") {
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    }

    // 3. Update user public metadata
    const client = await clerkClient();
    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        isAllowed: isAllowed
      }
    });

    return NextResponse.json({ success: true, message: `User access updated to ${isAllowed}` });
  } catch (error: unknown) {
    console.error("Error toggling user access:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
