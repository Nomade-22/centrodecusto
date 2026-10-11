import { NextResponse } from "next/server";
import sql from "@/app/api/utils/sql";
import { readJson, requireAuth, serverError } from "@/app/api/_helpers/auth";

type Params = { params: Promise<{ id: string }> };

/** PUT /api/price-table/hour-types/:id */
export async function PUT(req: Request, { params }: Params) {
  const { response } = await requireAuth(req);
  if (response) return response;

  const { id } = await params;
  const body = await readJson<{ name?: string; multiplier?: number }>(req);

  try {
    // `name` / `multiplier` are NOT NULL and the edit form may submit a partial
    // payload, so COALESCE keeps the stored value when a field is omitted.
    await sql`
      UPDATE hour_types
      SET name = COALESCE(${body.name ?? null}, name),
          multiplier = COALESCE(${body.multiplier ?? null}, multiplier),
          updated_at = to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS')
      WHERE id = ${id}
    `;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating hour type:", error);
    return serverError("Erro ao atualizar tipo de hora");
  }
}

/** DELETE /api/price-table/hour-types/:id */
export async function DELETE(req: Request, { params }: Params) {
  const { response } = await requireAuth(req);
  if (response) return response;

  const { id } = await params;

  try {
    const rows = await sql`SELECT hour_id FROM hour_types WHERE id = ${id}`;
    if (rows.length === 0) {
      return NextResponse.json({ error: "Tipo de hora não encontrado" }, { status: 404 });
    }

    const hourId = String(rows[0].hour_id);
    const pattern = `%"hourTypeId":"${hourId}"%`;
    const usage = await sql`
      SELECT count(*)::int AS count
      FROM orcamentos
      WHERE dados LIKE ${pattern}
    `;

    if (Number(usage[0]?.count ?? 0) > 0) {
      return NextResponse.json(
        { error: "Este tipo de hora já foi usado em orçamentos e não pode ser excluído. Altere apenas o nome/multiplicador para preservar o histórico." },
        { status: 409 }
      );
    }

    await sql`DELETE FROM hour_types WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting hour type:", error);
    return serverError("Erro ao excluir tipo de hora");
  }
}
