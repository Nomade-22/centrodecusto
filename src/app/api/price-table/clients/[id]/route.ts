import { NextResponse } from "next/server";
import sql from "@/app/api/utils/sql";
import { readJson, requireAdmin, serverError } from "@/app/api/_helpers/auth";

type Params = { params: Promise<{ id: string }> };

/** PUT /api/price-table/clients/:id */
export async function PUT(req: Request, { params }: Params) {
  const { response } = await requireAdmin(req);
  if (response) return response;

  const { id } = await params;
  const body = await readJson<{
    name?: string;
    dias?: number;
    negotiation_pct?: number;
    iss_retained_pct?: number;
    inss_retained_pct?: number;
    anticipate?: boolean;
    active?: boolean;
  }>(req);

  try {
    await sql`
      UPDATE labor_clients
      SET name = COALESCE(${body.name ?? null}, name),
          dias = COALESCE(${body.dias ?? null}, dias),
          negotiation_pct = COALESCE(${body.negotiation_pct ?? null}, negotiation_pct),
          iss_retained_pct = COALESCE(${body.iss_retained_pct ?? null}, iss_retained_pct),
          inss_retained_pct = COALESCE(${body.inss_retained_pct ?? null}, inss_retained_pct),
          anticipate = COALESCE(${body.anticipate ?? null}, anticipate),
          active = COALESCE(${body.active ?? null}, active),
          updated_at = to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS')
      WHERE id = ${id}
    `;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating client:", error);
    return serverError("Erro ao atualizar cliente");
  }
}

/**
 * DELETE is implemented as a soft delete. Historical budgets reference the
 * textual client id, so physically deleting it can make old snapshots harder
 * to inspect. Inactive clients disappear from new budgets.
 */
export async function DELETE(req: Request, { params }: Params) {
  const { response } = await requireAdmin(req);
  if (response) return response;

  const { id } = await params;
  try {
    await sql`
      UPDATE labor_clients
      SET active = false,
          updated_at = to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS')
      WHERE id = ${id}
    `;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deactivating client:", error);
    return serverError("Erro ao desativar cliente");
  }
}
