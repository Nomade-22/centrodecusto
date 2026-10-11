import { NextResponse } from "next/server";
import sql from "@/app/api/utils/sql";
import { badRequest, readJson, requireAuth, serverError } from "@/app/api/_helpers/auth";

/** POST /api/price-table/hour-types — add an hour type (normal, 50%, 100%, …). */
export async function POST(req: Request) {
  const { response } = await requireAuth(req);
  if (response) return response;

  const body = await readJson<{
    hour_id?: string;
    name?: string;
    multiplier?: number;
  }>(req);

  if (!body.hour_id || !body.name) {
    return badRequest("ID e nome são obrigatórios");
  }

  try {
    await sql`
      INSERT INTO hour_types (hour_id, name, multiplier, created_at, updated_at)
      VALUES (
        ${body.hour_id},
        ${body.name},
        ${body.multiplier || 1},
        to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS'),
        to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS')
      )
    `;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error adding hour type:", error);
    return serverError("Erro ao adicionar tipo de hora");
  }
}
