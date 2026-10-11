import { NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';
import { readJson, requireAuth, serverError } from '@/app/api/_helpers/auth';

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Params) {
  const { response } = await requireAuth(req);
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
  const { response } = await requireAuth(req);
  if (response) return response;
  const { id } = await params;

  try {
    const rows = await sql`SELECT worker_id FROM worker_types WHERE id = ${id}`;
    if (rows.length > 0) {
      await sql`DELETE FROM worker_rates WHERE worker_id = ${rows[0].worker_id}`;
    }
    await sql`DELETE FROM worker_types WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting worker type:', error);
    return serverError('Erro ao excluir função');
  }
}
