import { NextResponse } from "next/server";
import sql from "@/app/api/utils/sql";
import {
  badRequest,
  readJson,
  requireAdmin,
  serverError,
} from "@/app/api/_helpers/auth";

type Params = { params: Promise<{ id: string }> };

/** The account the worker refused to demote or delete. */
const PRIMARY_ADMIN_EMAIL = "adm.multprest@gmail.com";

/** PUT /api/allowed-users/:id — rename / toggle admin, admin only. */
export async function PUT(req: Request, { params }: Params) {
  const { response } = await requireAdmin(req);
  if (response) return response;

  const { id } = await params;
  const body = await readJson<{ name?: string | null; is_admin?: unknown }>(req);

  try {
    const rows = await sql`
      SELECT email, is_admin::int AS is_admin
      FROM allowed_users
      WHERE id = ${id}
    `;
    const existingEmail = rows[0]?.email as string | undefined;

    if (existingEmail?.toLowerCase() === PRIMARY_ADMIN_EMAIL && !body.is_admin) {
      return badRequest(
        "Não é possível remover privilégios de administrador do usuário principal"
      );
    }

    await sql`
      UPDATE allowed_users
      SET name = ${body.name || null},
          is_admin = ${body.is_admin ? 1 : 0},
          updated_at = to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS')
      WHERE id = ${id}
    `;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating allowed user:", error);
    return serverError("Erro ao atualizar usuário");
  }
}

/** DELETE /api/allowed-users/:id — revoke access, admin only. */
export async function DELETE(req: Request, { params }: Params) {
  const { response } = await requireAdmin(req);
  if (response) return response;

  const { id } = await params;

  try {
    const rows = await sql`SELECT email FROM allowed_users WHERE id = ${id}`;
    const email = rows[0]?.email as string | undefined;

    if (email?.toLowerCase() === PRIMARY_ADMIN_EMAIL) {
      return badRequest(
        "Não é possível excluir o usuário administrador principal"
      );
    }

    await sql`DELETE FROM allowed_users WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting allowed user:", error);
    return serverError("Erro ao excluir usuário");
  }
}
