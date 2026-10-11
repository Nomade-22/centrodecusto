import { NextResponse } from "next/server";
import sql from "@/app/api/utils/sql";
import { badRequest, readJson, requireAuth, serverError } from "@/app/api/_helpers/auth";

export async function POST(req: Request) {
  const { response } = await requireAuth(req);
  if (response) return response;

  const body = await readJson<{ worker_id?: string; name?: string; icon?: string }>(req);
  if (!body.worker_id || !body.name) return badRequest("ID e nome são obrigatórios");

  try {
    await sql`
      INSERT INTO worker_types (worker_id, name, icon, created_at, updated_at)
      VALUES (
        ${body.worker_id}, ${body.name}, ${body.icon || "👷"},
        to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS'),
        to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS')
      )
    `;

    await sql`
      INSERT INTO hh_worker_salaries (worker_id, salary_base, updated_at)
      VALUES (${body.worker_id}, 0, now())
      ON CONFLICT (worker_id) DO NOTHING
    `;

    await sql`
      INSERT INTO worker_rates (worker_id, client_id, rate, created_at, updated_at)
      SELECT ${body.worker_id}, client_id, 0,
             to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS'),
             to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS')
      FROM labor_clients
      ON CONFLICT (worker_id, client_id) DO NOTHING
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error adding worker type:", error);
    return serverError("Erro ao adicionar função");
  }
}
