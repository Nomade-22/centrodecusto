import { NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';
import { readJson, requireAdmin, serverError } from '@/app/api/_helpers/auth';

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Params) {
  const { response } = await requireAdmin(req);
  if (response) return response;
  const { id } = await params;
  const body = await readJson<{ name?: string; icon?: string }>(req);

  try {
    await sql`
      UPDATE worker_types
      SET name = COALESCE(${body.name ?? null}, name),
          icon = COALESCE(${body.icon ?? null}, icon),
          updated_at = to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS')
      WHERE id = ${id}
    `;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating worker type:', error);
    return serverError('Erro ao atualizar função');
  }
}

export async function DELETE(req: Request, { params }: Params) {
  const { response } = await requireAdmin(req);
  if (response) return response;
  const { id } = await params;

  try {
    const rows = await sql`SELECT worker_id FROM worker_types WHERE id = ${id}`;
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Função não encontrada' }, { status: 404 });
    }

    const workerId = String(rows[0].worker_id);
    const pattern = `%"workerTypeId":"${workerId}"%`;
    const usage = await sql`
      SELECT count(*)::int AS count
      FROM orcamentos
      WHERE dados LIKE ${pattern}
    `;

    if (Number(usage[0]?.count ?? 0) > 0) {
      return NextResponse.json(
        { error: 'Esta função já foi usada em orçamentos e não pode ser excluída. Edite apenas o nome/ícone para preservar o histórico.' },
        { status: 409 }
      );
    }

    await sql`DELETE FROM worker_rates WHERE worker_id = ${workerId}`;
    await sql`DELETE FROM worker_types WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting worker type:', error);
    return serverError('Erro ao excluir função');
  }
}
