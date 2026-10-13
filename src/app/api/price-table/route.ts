import { NextResponse } from 'next/server';
import { requireAuth, serverError } from '@/app/api/_helpers/auth';
import { loadHHData } from '@/lib/hh-server';

/**
 * GET /api/price-table
 *
 * Current commercial prices are calculated from the HH tables. `worker_rates`
 * remains only as a compatibility/materialized table for the migrated app and
 * historical diagnostics; it is no longer the source of truth.
 */
export async function GET(req: Request) {
  const access = await requireAuth(req);
  if (access.response) return access.response;
  try {
    const data = await loadHHData();

    return NextResponse.json({
      clients: data.clients,
      workers: data.workers.map((worker) => ({
        id: worker.id,
        worker_id: worker.worker_id,
        name: worker.name,
        icon: worker.icon,
        custo_hora: worker.cost_per_hour,
        lucro_hora: worker.economic_result_per_hour,
        salary_base: worker.salary_base,
        monthly_cost: worker.monthly_cost,
      })),
      hourTypes: data.hourTypes,
      rates: data.rates,
      hhSettings: data.settings,
      fixedCostTotal: data.fixedCostTotal,
    });
  } catch (error) {
    console.error('Error fetching price table:', error);
    return serverError('Erro ao buscar tabela de preços');
  }
}
