import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/session";

export async function POST() {
  const REALM = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const response = NextResponse.redirect(REALM);
  const cookie = clearSessionCookie();
  response.cookies.set(cookie);
  return response;
}
