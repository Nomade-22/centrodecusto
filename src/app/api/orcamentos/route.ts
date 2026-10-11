import { NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';
import { badRequest, readJson, serverError } from '@/app/api/_helpers/auth';
import { auth } from '@/lib/auth';

/**
 * GET /api/orcamentos — list saved budgets, newest first.
 *
 * `id` / `is_fechado` are BIGINT in the migrated schema and the Neon driver
 * returns int8 as a string. The frontend types them as numbers and relies on
 * `is_fechado` being falsy for 0, so cast both to int here.
 */
export async function GET(_req: Request) {
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
  // Try to get user from session, but don't block if there's no session
  let userEmail: string | null = null;
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    userEmail = session?.user?.email ?? null;
  } catch {
    // no session — save without user email
  }

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
