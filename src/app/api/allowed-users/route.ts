import { NextResponse } from "next/server";
import sql from "@/app/api/utils/sql";
import {
  badRequest,
  isUniqueViolation,
  readJson,
  requireAdmin,
  serverError,
} from "@/app/api/_helpers/auth";

/**
 * GET /api/allowed-users — the access allow-list, admin only.
 *
 * `id` / `is_admin` are BIGINT; cast to int so the frontend's
 * `user.is_admin === 1` check keeps working (the Neon driver returns int8 as a
 * string, which would make "0" truthy and === 1 false).
 */
export async function GET(req: Request) {
  const { response } = await requireAdmin(req);
  if (response) return response;

  try {
    const rows = await sql`
      SELECT id::int AS id,
             email,
             name,
             is_admin::int AS is_admin,
             created_at
      FROM allowed_users
      ORDER BY created_at DESC
    `;
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error fetching allowed users:", error);
    return serverError("Erro ao buscar usuários");
  }
}

/** POST /api/allowed-users — grant access to an email, admin only. */
export async function POST(req: Request) {
  const { response } = await requireAdmin(req);
  if (response) return response;

  const body = await readJson<{
    email?: string;
    name?: string | null;
    is_admin?: unknown;
  }>(req);

  if (!body.email) {
    return badRequest("Email é obrigatório");
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(body.email)) {
    return badRequest("Email inválido");
  }

  try {
    await sql`
      INSERT INTO allowed_users (email, name, is_admin, created_at, updated_at)
      VALUES (
        ${body.email.toLowerCase()},
        ${body.name || null},
        ${body.is_admin ? 1 : 0},
        to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS'),
        to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS')
      )
    `;
    return NextResponse.json({ success: true });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return badRequest("Este email já está cadastrado");
    }
    console.error("Error adding allowed user:", error);
    return serverError("Erro ao adicionar usuário");
  }
}
