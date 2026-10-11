import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

function readSetCookies(headers: Headers): string[] {
  const withGetSetCookie = headers as unknown as {
    getSetCookie?: () => string[];
  };
  if (typeof withGetSetCookie.getSetCookie === "function") {
    return withGetSetCookie.getSetCookie();
  }
  const single = headers.get("set-cookie");
  return single ? [single] : [];
}

/**
 * GET /api/logout
 *
 * Was: `deleteSession(token)` against the Mocha users-service, then clear the
 * MOCHA_SESSION_TOKEN cookie. Now delegates to better-auth's sign-out and
 * forwards the cookie-clearing headers it produces.
 */
export async function GET(req: Request) {
  const out = NextResponse.json({ success: true }, { status: 200 });

  try {
    const signedOut = (await auth.api.signOut({
      headers: req.headers,
      asResponse: true,
    })) as unknown as Response;
    for (const cookie of readSetCookies(signedOut.headers)) {
      out.headers.append("set-cookie", cookie);
    }
  } catch (error) {
    // A missing / already-expired session must still report success, exactly
    // like the worker did.
    console.error("Error signing out:", error);
  }

  return out;
}
