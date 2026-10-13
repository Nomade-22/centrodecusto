import { NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';
import { badRequest, readJson, requireAuth, serverError } from '@/app/api/_helpers/auth';

/**
 * GET /api/orcamentos — list saved budgets, newest first.
 *
 * `id` / `is_fechado` are BIGINT in the migrated schema and the Neon driver
 * returns int8 as a string. The frontend types them as numbers and relies on
 * `is_fechado` being falsy for 0, so cast both to int here.
 */
export async function GET(req: Request) {
  const access = await requireAuth(req);
  if (access.response) return access.response;
  try {
    const rows = await sql`
      SELECT id::int AS id,
             numero,
             descricao,
             totais,
             is_fechado::int AS is_fechado,
             created_at
      FROM orcamentos
      ORDER BY created_at DESC
    `;
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error fetching orcamentos:', error);
    return serverError('Erro ao buscar orçamentos');
  }
}

/** POST /api/orcamentos — save the current budget. */
export async function POST(req: Request) {
  const access = await requireAuth(req);
  if (access.response) return access.response;
  const userEmail = access.user.email;

  const body = await readJson<{
    numero?: string;
    descricao?: string | null;
    dados?: unknown;
    totais?: unknown;
  }>(req);

  if (!body.numero || !body.dados) {
    return badRequest('Número e dados são obrigatórios');
  }

  try {
    const rows = await sql`
      INSERT INTO orcamentos (numero, descricao, dados, totais, user_email, created_at, updated_at)
      VALUES (
        ${body.numero},
        ${body.descricao || null},
        ${JSON.stringify(body.dados)},
        ${JSON.stringify(body.totais || {})},
        ${userEmail},
        to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS'),
        to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS')
      )
      RETURNING id::int AS id
    `;

    return NextResponse.json({ success: true, id: rows[0]?.id ?? null });
  } catch (error) {
    console.error('Error saving orcamento:', error);
    return serverError('Erro ao salvar orçamento');
  }
}
