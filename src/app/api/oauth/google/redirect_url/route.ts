import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * GET /api/oauth/google/redirect_url
 *
 * Was: `getOAuthRedirectUrl("google", { apiUrl, apiKey })` against the Mocha
 * users-service. better-auth owns the OAuth dance now, so we ask it for the
 * provider consent URL instead. If Google isn't configured for this project
 * (no GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET injected), fall back to the
 * platform sign-in page so the button still leads somewhere useful.
 */
// better-auth types `provider` against the *configured* provider union, which
// is conditional on env vars, so go through a narrow structural signature.
type SignInSocial = (opts: {
  body: { provider: string; callbackURL?: string };
}) => Promise<{ url?: string | null } | null>;

export async function GET() {
  try {
    const signInSocial = auth.api.signInSocial as unknown as SignInSocial;
    const result = await signInSocial({
      body: { provider: "google", callbackURL: "/" },
    });

    const redirectUrl = result?.url;
    if (redirectUrl) {
      return NextResponse.json({ redirectUrl }, { status: 200 });
    }
  } catch (error) {
    console.error("Error building Google redirect url:", error);
  }

  return NextResponse.json({ redirectUrl: "/account/signin" }, { status: 200 });
}
