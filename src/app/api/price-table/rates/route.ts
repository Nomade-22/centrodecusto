import { NextResponse } from "next/server";
import sql from "@/app/api/utils/sql";
import { badRequest, readJson, requireAdmin, serverError } from "@/app/api/_helpers/auth";

/**
 * PUT /api/price-table/rates — set the rate for one worker/client pair.
 *
 * The worker did UPDATE-then-INSERT-if-zero-rows using `result.meta.changes`.
 * Postgres has a real upsert and `worker_rates` already carries a
 * `unique (worker_id, client_id)` constraint, so collapse it into one
 * statement — same outcome, no read-modify-write race.
 */
export async function PUT(req: Request) {
  const { response } = await requireAdmin(req);
  if (response) return response;

  const body = await readJson<{
    worker_id?: string;
    client_id?: string;
    rate?: number;
  }>(req);

  if (!body.worker_id || !body.client_id || body.rate === undefined) {
    return badRequest("worker_id, client_id e rate são obrigatórios");
  }

  try {
    await sql`
      INSERT INTO worker_rates (worker_id, client_id, rate, created_at, updated_at)
      VALUES (
        ${body.worker_id},
        ${body.client_id},
        ${body.rate},
        to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS'),
        to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS')
      )
      ON CONFLICT (worker_id, client_id) DO UPDATE
      SET rate = EXCLUDED.rate,
          updated_at = to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS')
    `;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating rate:", error);
    return serverError("Erro ao atualizar taxa");
  }
}
