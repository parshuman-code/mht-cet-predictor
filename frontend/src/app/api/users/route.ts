import { NextResponse } from "next/server";
import { currentUser, clerkClient } from "@clerk/nextjs/server";

export async function GET() {
  try {
    // 1. Verify admin
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Check if the user is the admin
    const email = user.emailAddresses[0]?.emailAddress;
    if (email !== "prashantgadwe142006@gmail.com") {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
    }

    // 2. Fetch all users from Clerk
    const client = await clerkClient();
    const userList = await client.users.getUserList({
      limit: 100, // adjust as needed
      orderBy: "-created_at"
    });

    // 3. Format the response
    const formattedUsers = userList.data.map(u => ({
      id: u.id,
      email: u.emailAddresses[0]?.emailAddress || "No Email",
      firstName: u.firstName,
      lastName: u.lastName,
      createdAt: u.createdAt,
      lastSignInAt: u.lastSignInAt,
      isAllowed: u.publicMetadata?.isAllowed !== false // Default is true unless explicitly false
    }));

    return NextResponse.json({ users: formattedUsers });
  } catch (error: unknown) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
