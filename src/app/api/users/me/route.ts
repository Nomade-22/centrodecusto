import { NextResponse } from "next/server";
import {
  forbidden,
  getSessionUser,
  isEmailAdmin,
  isEmailAllowed,
} from "@/app/api/_helpers/auth";

function splitName(name: string | null | undefined) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  return {
    givenName: parts[0] ?? null,
    familyName: parts.length > 1 ? parts.slice(1).join(" ") : null,
  };
}

/**
 * GET /api/users/me
 *
 * Returns the session user in the Mocha-compatible shape the frontend expects,
 * plus the `isAdmin` flag the worker added. The allow-list re-check from the
 * worker is preserved.
 */
export async function GET(req: Request) {
  const user = await getSessionUser(req);
  const allowed = await isEmailAllowed(user?.email || "");
  if (!user || !allowed) {
    return forbidden("Acesso não autorizado");
  }

  const isAdmin = await isEmailAdmin(user.email);
  const { givenName, familyName } = splitName(user.name);
  const createdAt =
    user.createdAt instanceof Date
      ? user.createdAt.toISOString()
      : (user.createdAt ?? null);

  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name ?? null,
    userName: user.name ?? null,
    picture: user.image ?? null,
    google_sub: user.id ?? null,
    given_name: givenName,
    family_name: familyName,
    email_verified: user.emailVerified ?? null,
    created_at: createdAt,
    google_user_data: {
      sub: user.id ?? null,
      name: user.name ?? null,
      given_name: givenName,
      family_name: familyName,
      email: user.email ?? null,
      picture: user.image ?? null,
      email_verified: user.emailVerified ?? null,
    },
    isAdmin,
  });
}
