import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Retorna apenas se o login Google está operacionalmente configurado.
 * Nunca expõe GOOGLE_CLIENT_ID ou GOOGLE_CLIENT_SECRET ao navegador.
 */
export async function GET() {
  const enabled = Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() &&
    process.env.GOOGLE_CLIENT_SECRET?.trim()
  );
  return NextResponse.json(
    { enabled },
    { headers: { "Cache-Control": "no-store" } }
  );
}
