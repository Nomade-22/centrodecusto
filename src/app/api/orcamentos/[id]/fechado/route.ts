import { NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';
import { readJson, serverError } from '@/app/api/_helpers/auth';

type Params = { params: Promise<{ id: string }> };

/**
 * PATCH /api/orcamentos/:id/fechado — toggle the "closed" flag.
 *
 * `is_fechado` is INTEGER 0/1 in the migrated schema, so keep writing 0/1
 * rather than a Postgres boolean.
 */
export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const body = await readJson<{ is_fechado?: unknown }>(req);

  try {
    await sql`
      UPDATE orcamentos
      SET is_fechado = ${body.is_fechado ? 1 : 0},
          updated_at = to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS')
      WHERE id = ${id}
    `;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating orcamento fechado:', error);
    return serverError('Erro ao atualizar orçamento');
  }
}
