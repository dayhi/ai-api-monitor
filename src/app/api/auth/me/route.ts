import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ loggedIn: false });
  }
  return NextResponse.json({ loggedIn: true, username: session.username });
}
