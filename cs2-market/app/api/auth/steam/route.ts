import { NextRequest, NextResponse } from "next/server";
import openid from "openid";

function getRealm(request: NextRequest): string {
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "localhost:3001";
  const proto = request.headers.get("x-forwarded-proto") || "http";
  return `${proto}://${host}`;
}

export async function GET(request: NextRequest) {
  const realm = getRealm(request);
  const returnUrl = `${realm}/api/auth/callback`;

  return new Promise<NextResponse>((resolve) => {
    const relyingParty = new openid.RelyingParty(returnUrl, realm, true, false, []);

    relyingParty.authenticate(
      "https://steamcommunity.com/openid",
      false,
      (error: Error | null, authUrl: string | null) => {
        if (error || !authUrl) {
          resolve(NextResponse.json({ error: "Auth failed" }, { status: 500 }));
          return;
        }
        resolve(NextResponse.redirect(authUrl));
      }
    );
  });
}
