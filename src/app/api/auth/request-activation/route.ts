import { Pool, neonConfig } from "@neondatabase/serverless";
import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import ws from "ws";

export const runtime = "nodejs";
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const generic = {
  message: "Se este e-mail estiver autorizado e ainda não possuir senha, você receberá o link de ativação.",
};

/**
 * Gera um convite de uso único e o envia SOMENTE ao e-mail pré-autorizado,
 * pelo provedor de e-mail transacional. Não retorna o token pela API.
 */
export async function POST(request: Request) {
  let data: unknown;
  try {
    data = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitação inválida." }, { status: 400 });
  }

  const email = typeof data === "object" && data !== null && "email" in data
    ? (data as { email: unknown }).email
    : null;

  if (typeof email !== "string" || email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return NextResponse.json({ error: "Informe um e-mail válido." }, { status: 400 });
  }

  const key = process.env.RESEND_API_KEY;
  const sender = process.env.ACTIVATION_EMAIL_FROM;
  const baseUrl = process.env.BETTER_AUTH_URL;

  if (!key || !sender || !baseUrl) {
    return NextResponse.json(
      { error: "O envio de e-mails ainda não foi configurado pelo administrador." },
      { status: 503 },
    );
  }

  const normalizedEmail = email.trim().toLowerCase();
  let userId: string | undefined;
  try {
    const allowed = await pool.query<{ id: string }>(
      `SELECT u.id FROM public."user" u
       JOIN public.allowed_users a ON lower(a.email) = lower(u.email)
       WHERE lower(u.email) = $1
         AND NOT EXISTS (
           SELECT 1 FROM public.account c
           WHERE c."userId" = u.id AND c."providerId" = 'credential'
         )
         AND NOT EXISTS (
           SELECT 1 FROM public.password_activation_tokens t
           WHERE t.user_id = u.id AND t.used_at IS NULL
             AND t.created_at > now() - interval '10 minutes'
         )
       LIMIT 1`,
      [normalizedEmail],
    );
    userId = allowed.rows[0]?.id;
  } catch (error) {
    console.error("Activation eligibility check failed:", error);
    return NextResponse.json({ error: "Não foi possível solicitar o link agora." }, { status: 503 });
  }

  // Mesmo retorno para e-mail inexistente, não autorizado ou em cooldown.
  if (!userId) return NextResponse.json(generic, { status: 202 });

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");

  try {
    // Insert only if the user is still eligible; avoids concurrent duplicate sends.
    const created = await pool.query(
      `INSERT INTO public.password_activation_tokens (token_hash, user_id, expires_at)
       SELECT $1, u.id, now() + interval '60 minutes'
       FROM public."user" u
       JOIN public.allowed_users a ON lower(a.email) = lower(u.email)
       WHERE u.id = $2
         AND NOT EXISTS (
           SELECT 1 FROM public.account c
           WHERE c."userId" = u.id AND c."providerId" = 'credential'
         )
         AND NOT EXISTS (
           SELECT 1 FROM public.password_activation_tokens t
           WHERE t.user_id = u.id AND t.used_at IS NULL
             AND t.created_at > now() - interval '10 minutes'
         )
       RETURNING token_hash`,
      [tokenHash, userId],
    );
    if (created.rowCount !== 1) return NextResponse.json(generic, { status: 202 });

    const url = new URL("/account/activate", baseUrl);
    // The fragment does not go to the web server or application logs.
    url.hash = rawToken;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: sender,
        to: [normalizedEmail],
        subject: "Ative seu acesso ao Centro de Custo Multprest",
        text:
          `Foi solicitado o primeiro acesso ao Centro de Custo Multprest.\n\n` +
          `Para criar sua senha, acesse o link abaixo:\n${url.toString()}\n\n` +
          `O link expira em 60 minutos e pode ser usado uma única vez.\n` +
          `Se você não solicitou este acesso, ignore esta mensagem.\n`,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Email delivery returned status ${response.status}`);
    }
    return NextResponse.json(generic, { status: 202 });
  } catch (error) {
    // Never leave a valid link in the database if its email couldn't be sent.
    await pool.query(
      "DELETE FROM public.password_activation_tokens WHERE token_hash = $1 AND used_at IS NULL",
      [tokenHash],
    ).catch(() => undefined);
    console.error("Activation email dispatch failed:", error);
    return NextResponse.json(
      { error: "O e-mail não pôde ser enviado. Tente novamente mais tarde." },
      { status: 503 },
    );
  }
}
