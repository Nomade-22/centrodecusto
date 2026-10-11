import { NextResponse } from "next/server";
import sql from "@/app/api/utils/sql";
import { badRequest, readJson, requireAuth, serverError } from "@/app/api/_helpers/auth";

export async function POST(req: Request) {
  const { response } = await requireAuth(req);
  if (response) return response;

  const body = await readJson<{
    client_id?: string;
    name?: string;
    dias?: number;
    negotiation_pct?: number;
    iss_retained_pct?: number;
    inss_retained_pct?: number;
    anticipate?: boolean;
  }>(req);

  if (!body.client_id || !body.name) {
    return badRequest("ID e nome são obrigatórios");
  }

  try {
    await sql`
      INSERT INTO labor_clients (
        client_id, name, dias, negotiation_pct, iss_retained_pct,
        inss_retained_pct, anticipate, active, created_at, updated_at
      ) VALUES (
        ${body.client_id}, ${body.name}, ${body.dias ?? 30},
        ${body.negotiation_pct ?? 8}, ${body.iss_retained_pct ?? 4.36},
        ${body.inss_retained_pct ?? 0}, ${body.anticipate ?? true}, true,
        to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS'),
        to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS')
      )
    `;

    // Compatibility cache only. Current selling rates are generated from HH.
    await sql`
      INSERT INTO worker_rates (worker_id, client_id, rate, created_at, updated_at)
      SELECT worker_id, ${body.client_id}, 0,
             to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS'),
             to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS')
      FROM worker_types
      ON CONFLICT (worker_id, client_id) DO NOTHING
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error adding client:", error);
    return serverError("Erro ao adicionar cliente");
  }
}
