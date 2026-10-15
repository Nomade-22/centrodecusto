import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import sql from "@/app/api/utils/sql";

/**
 * Shared helpers for the routes migrated from the Hono worker.
 *
 * The original worker used Mocha's `authMiddleware` / `adminMiddleware` pair.
 * `authMiddleware` only required a valid session; `adminMiddleware` additionally
 * required an `allowed_users` row with `is_admin = 1`. Both behaviours are
 * preserved here on top of better-auth.
 */

export type SessionUser = {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  emailVerified?: boolean | null;
  createdAt?: Date | string | null;
};

export async function getSessionUser(req: Request): Promise<SessionUser | null> {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user?.email) return null;
    return session.user as unknown as SessionUser;
  } catch (error) {
    console.error("Error reading session:", error);
    return null;
  }
}

/** Mirrors `isEmailAllowed(db, email)` from the worker. */
export async function isEmailAllowed(email: string): Promise<boolean> {
  if (!email) return false;
  const rows = await sql`
    SELECT id FROM allowed_users WHERE LOWER(email) = LOWER(${email}) LIMIT 1
  `;
  return rows.length > 0;
}

/**
 * Mirrors `isEmailAdmin(db, email)` from the worker. `is_admin` is an INTEGER
 * column (the Postgres schema demotes BOOLEAN to 0/1), so compare with `= 1`.
 */
export async function isEmailAdmin(email: string): Promise<boolean> {
  if (!email) return false;
  const rows = await sql`
    SELECT id FROM allowed_users
    WHERE LOWER(email) = LOWER(${email}) AND is_admin = 1
    LIMIT 1
  `;
  return rows.length > 0;
}

/** Returns true while an account still has a temporary credential. */
export async function requiresPasswordChange(userId: string): Promise<boolean> {
  const rows = await sql`
    SELECT 1
    FROM public.temporary_passwords temp
    JOIN public.account credential ON credential."userId" = temp.user_id
    WHERE temp.user_id = ${userId}
      AND credential."providerId" = 'credential'
      AND credential.password = temp.password_hash
    LIMIT 1
  `;
  return rows.length > 0;
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function unauthorized(message = "Não autenticado") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbidden(message = "Acesso não autorizado") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function notFound(message: string) {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function serverError(message: string) {
  return NextResponse.json({ error: message }, { status: 500 });
}

export type AuthResult =
  | { user: SessionUser; response: null }
  | { user: null; response: NextResponse };

/** Equivalent of the worker's `authMiddleware`. */
export async function requireAuth(req: Request): Promise<AuthResult> {
  const user = await getSessionUser(req);
  if (!user) return { user: null, response: unauthorized() };
  if (!(await isEmailAllowed(user.email))) {
    return { user: null, response: forbidden('Usuário não autorizado para o Centro de Custo') };
  }
  if (await requiresPasswordChange(user.id)) {
    return { user: null, response: forbidden("Altere a senha provisória antes de acessar os dados.") };
  }
  return { user, response: null };
}

/** Equivalent of `authMiddleware` + `adminMiddleware`. */
export async function requireAdmin(req: Request): Promise<AuthResult> {
  const user = await getSessionUser(req);
  if (!user) return { user: null, response: unauthorized() };
  if (!(await isEmailAdmin(user.email))) {
    return {
      user: null,
      response: forbidden("Acesso restrito a administradores"),
    };
  }
  if (await requiresPasswordChange(user.id)) {
    return { user: null, response: forbidden("Altere a senha provisória antes de acessar os dados.") };
  }
  return { user, response: null };
}

/** D1 surfaced "UNIQUE constraint failed"; Postgres uses SQLSTATE 23505. */
export function isUniqueViolation(error: unknown): boolean {
  const err = error as { code?: unknown; message?: unknown } | null | undefined;
  if (!err) return false;
  if (err.code === "23505") return true;
  return (
    typeof err.message === "string" &&
    (err.message.includes("duplicate key value") ||
      err.message.includes("UNIQUE constraint failed"))
  );
}

export async function readJson<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    return {} as T;
  }
}
