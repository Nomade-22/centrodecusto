import { NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';
import { readJson, requireAdmin, serverError } from '@/app/api/_helpers/auth';
import { loadHHData, syncHHMaterializedValues } from '@/lib/hh-server';

export async function GET(req: Request) {
  const access = await requireAdmin(req);
  if (access.response) return access.response;
  try {
    const data = await loadHHData();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error loading HH calculator:', error);
    return serverError('Erro ao carregar Calculadora HH');
  }
}

interface HHUpdateBody {
  settings?: Record<string, number | boolean>;
  salaries?: Array<{ worker_id: string; salary_base: number }>;
  fixedCosts?: Array<{ id: number; name?: string; amount: number; sort_order?: number }>;
}

export async function PUT(req: Request) {
  const { response } = await requireAdmin(req);
  if (response) return response;

  const body = await readJson<HHUpdateBody>(req);

  try {
    if (body.settings) {
      const s = body.settings;
      await sql`
        UPDATE hh_settings SET
          salary_minimum = ${Number(s.salary_minimum ?? 0)},
          prize = ${Number(s.prize ?? 0)},
          prize_in_charges = ${Boolean(s.prize_in_charges)},
          insalubrity_pct = ${Number(s.insalubrity_pct ?? 0)},
          monthly_hours = ${Number(s.monthly_hours ?? 220)},
          productive_employees = ${Math.max(1, Math.round(Number(s.productive_employees ?? 1)))},
          employer_inss_rat_fap_pct = ${Number(s.employer_inss_rat_fap_pct ?? 0)},
          fgts_pct = ${Number(s.fgts_pct ?? 0)},
          fgts_fine_pct = ${Number(s.fgts_fine_pct ?? 0)},
          das_effective_pct = ${Number(s.das_effective_pct ?? 0)},
          default_iss_retained_pct = ${Number(s.default_iss_retained_pct ?? 0)},
          default_inss_retained_pct = ${Number(s.default_inss_retained_pct ?? 0)},
          markup_pct = ${Number(s.markup_pct ?? 0)},
          anticipation_daily_pct = ${Number(s.anticipation_daily_pct ?? 0)},
          epi_monthly = ${Number(s.epi_monthly ?? 0)},
          exams_monthly = ${Number(s.exams_monthly ?? 0)},
          tools_monthly = ${Number(s.tools_monthly ?? 0)},
          health_monthly = ${Number(s.health_monthly ?? 0)},
          lunch_monthly = ${Number(s.lunch_monthly ?? 0)},
          transport_monthly = ${Number(s.transport_monthly ?? 0)},
          insurance_total_monthly = ${Number(s.insurance_total_monthly ?? 0)},
          training_annual = ${Number(s.training_annual ?? 0)},
          updated_at = now()
        WHERE id = 1
      `;
    }

    if (Array.isArray(body.salaries)) {
      for (const item of body.salaries) {
        await sql`
          INSERT INTO hh_worker_salaries (worker_id, salary_base, updated_at)
          VALUES (${item.worker_id}, ${Number(item.salary_base || 0)}, now())
          ON CONFLICT (worker_id) DO UPDATE
          SET salary_base = EXCLUDED.salary_base, updated_at = now()
        `;
      }
    }

    if (Array.isArray(body.fixedCosts)) {
      for (const item of body.fixedCosts) {
        await sql`
          UPDATE hh_fixed_costs
          SET name = COALESCE(${item.name ?? null}, name),
              amount = ${Number(item.amount || 0)},
              sort_order = COALESCE(${item.sort_order ?? null}, sort_order),
              updated_at = now()
          WHERE id = ${item.id}
        `;
      }
    }

    const data = await syncHHMaterializedValues();
    return NextResponse.json({ success: true, ...data });
  } catch (error) {
    console.error('Error saving HH calculator:', error);
    return serverError('Erro ao salvar Calculadora HH');
  }
}
