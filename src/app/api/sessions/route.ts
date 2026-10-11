import { NextResponse } from "next/server";
import {
  forbidden,
  getSessionUser,
  isEmailAllowed,
  unauthorized,
} from "@/app/api/_helpers/auth";

const NOT_ALLOWED =
  "Acesso não autorizado. Seu email não tem permissão para acessar este sistema.";

/**
 * POST /api/sessions
 *
 * Was: exchange a Mocha OAuth `code` for a session token, verify the email is
 * in `allowed_users`, then set the MOCHA_SESSION_TOKEN cookie.
 *
 * better-auth completes the OAuth callback itself (via /api/auth/[...all]) and
 * sets its own session cookie, so there is no code to exchange here. What
 * remains — and what this app depends on — is the allow-list gate: a session
 * whose email has no `allowed_users` row must be rejected.
 */
export async function POST(req: Request) {
  const user = await getSessionUser(req);
  if (!user) {
    return unauthorized("Sessão não encontrada. Faça login novamente.");
  }

  const allowed = await isEmailAllowed(user.email);
  if (!allowed) {
    return forbidden(NOT_ALLOWED);
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
