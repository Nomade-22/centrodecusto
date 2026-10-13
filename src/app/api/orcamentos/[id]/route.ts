import { NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';
import { notFound, requireAuth, requireAdmin, serverError } from '@/app/api/_helpers/auth';

type Params = { params: Promise<{ id: string }> };

/** GET /api/orcamentos/:id — full record, including the `dados` JSON blob. */
export async function GET(req: Request, { params }: Params) {
  const access = await requireAuth(req);
  if (access.response) return access.response;
  const { id } = await params;

  try {
    const rows = await sql`
      SELECT id::int AS id,
             numero,
             descricao,
             dados,
             totais,
             user_email,
             is_fechado::int AS is_fechado,
             created_at,
             updated_at
      FROM orcamentos
      WHERE id = ${id}
    `;

    if (rows.length === 0) {
      return notFound('Orçamento não encontrado');
    }
    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error('Error fetching orcamento:', error);
    return serverError('Erro ao buscar orçamento');
  }
}

/** DELETE /api/orcamentos/:id */
export async function DELETE(req: Request, { params }: Params) {
  const access = await requireAdmin(req);
  if (access.response) return access.response;
  const { id } = await params;

  try {
    await sql`DELETE FROM orcamentos WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting orcamento:', error);
    return serverError('Erro ao excluir orçamento');
  }
}
