import { Pool, neonConfig } from "@neondatabase/serverless";
import { hashPassword } from "better-auth/crypto";
import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import ws from "ws";

export const runtime = "nodejs";
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/**
 * First-time password activation for an EXISTING, pre-authorized user.
 * A single-use, time-limited token is provisioned outside the app and stored
 * in the database as SHA-256 only. Passwords are hashed using Better Auth.
 *
 * This is not a password-reset endpoint: existing credentials are never
 * overwritten and an expired/consumed token is never accepted.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitação inválida." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Solicitação inválida." }, { status: 400 });
  }

  const candidate = body as { token?: unknown; password?: unknown };
  const token = candidate.token;
  const password = candidate.password;
  if (
    typeof token !== "string" ||
    !/^[0-9a-f]{64}$/i.test(token) ||
    typeof password !== "string" ||
    password.length < 12 ||
    password.length > 128
  ) {
    return NextResponse.json(
      { error: "Utilize um link de ativação válido e uma senha de 12 a 128 caracteres." },
      { status: 400 },
    );
  }

  const tokenHash = createHash("sha256").update(token.toLowerCase()).digest("hex");

  // Check before doing expensive password hashing; re-check inside the lock.
  const validToken = await pool.query(
    `SELECT 1
     FROM public.password_activation_tokens
     WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
     LIMIT 1`,
    [tokenHash],
  );
  if (validToken.rowCount === 0) {
    return NextResponse.json(
      { error: "Link inválido, expirado ou já utilizado. Solicite um novo ao administrador." },
      { status: 400 },
    );
  }

  // Uses the same hashing algorithm as Better Auth signIn.email().
  const passwordHash = await hashPassword(password);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const found = await client.query<{ user_id: string }>(
      `SELECT t.user_id
       FROM public.password_activation_tokens t
       JOIN public."user" u ON u.id = t.user_id
       JOIN public.allowed_users allowed ON lower(allowed.email) = lower(u.email)
       WHERE t.token_hash = $1 AND t.used_at IS NULL AND t.expires_at > now()
       FOR UPDATE OF t`,
      [tokenHash],
    );
    if (found.rowCount !== 1) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Link inválido, expirado ou já utilizado." },
        { status: 400 },
      );
    }

    const userId = found.rows[0].user_id;
    const previous = await client.query(
      `SELECT id FROM public.account
       WHERE "userId" = $1 AND "providerId" = 'credential'
       LIMIT 1`,
      [userId],
    );
    if (previous.rowCount !== 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Esta conta já possui senha. A ativação não altera uma senha existente." },
        { status: 409 },
      );
    }

    await client.query(
      `INSERT INTO public.account
        (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
       VALUES ($1, $2, 'credential', $2, $3, now(), now())`,
      [randomUUID(), userId, passwordHash],
    );

    const consumed = await client.query(
      `UPDATE public.password_activation_tokens
       SET used_at = now() WHERE token_hash = $1 AND used_at IS NULL
       RETURNING token_hash`,
      [tokenHash],
    );
    if (consumed.rowCount !== 1) throw new Error("Activation token was consumed concurrently");

    await client.query("COMMIT");
    return NextResponse.json({ success: true });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Password activation failed:", error);
    return NextResponse.json(
      { error: "Não foi possível ativar sua conta. Tente novamente mais tarde." },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
