import { NextRequest, NextResponse } from "next/server";
import openid from "openid";
import { signSession, setSessionCookie } from "@/lib/session";

function getRealm(request: NextRequest): string {
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "localhost:3001";
  const proto = request.headers.get("x-forwarded-proto") || "http";
  return `${proto}://${host}`;
}

export async function GET(request: NextRequest) {
  const realm = getRealm(request);
  const returnUrl = `${realm}/api/auth/callback`;
  const url = request.url;

  return new Promise<NextResponse>((resolve) => {
    const relyingParty = new openid.RelyingParty(returnUrl, realm, true, false, []);

    relyingParty.verifyAssertion(url, async (error: Error | null, result: { authenticated: boolean; claimedIdentifier?: string } | null) => {
      if (error || !result?.authenticated || !result.claimedIdentifier) {
        console.error("OpenID verify error:", error);
        resolve(NextResponse.redirect(`${realm}/?auth=failed`));
        return;
      }

      const steamIdMatch = result.claimedIdentifier.match(/\/(\d+)$/);
      if (!steamIdMatch) {
        resolve(NextResponse.redirect(`${realm}/?auth=failed`));
        return;
      }

      const steamId64 = steamIdMatch[1];

      try {
        const steamApiKey = process.env.STEAM_API_KEY;
        let displayName = `User_${steamId64.slice(-6)}`;
        let avatarUrl = "";

        if (steamApiKey && steamApiKey !== "your_steam_api_key_here") {
          const profileRes = await fetch(
            `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${steamApiKey}&steamids=${steamId64}`
          );
          const profileData = await profileRes.json();
          const player = profileData?.response?.players?.[0];
          if (player) {
            displayName = player.personaname || displayName;
            avatarUrl = player.avatarfull || "";
          }
        }

        const token = signSession({ id: steamId64, steamId: steamId64, displayName, avatarUrl, balance: 0 });
        const response = NextResponse.redirect(`${realm}/`);
        response.cookies.set(setSessionCookie(token));
        console.log("[Auth] Login OK:", displayName, steamId64);
        resolve(response);
      } catch (err) {
        console.error("Auth error:", err);
        resolve(NextResponse.redirect(`${realm}/?auth=error`));
      }
    });
  });
}
