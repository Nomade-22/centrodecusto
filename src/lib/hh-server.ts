import sql from '@/app/api/utils/sql';
import {
  calculateHHPrice,
  calculateWorkerHH,
  HHClientTerms,
  HHSettings,
  roundMoney,
} from '@/lib/hh-calculator';

export interface HHWorkerRow {
  id: number;
  worker_id: string;
  name: string;
  icon: string;
  salary_base: number;
}

export interface HHFixedCostRow {
  id: number;
  name: string;
  amount: number;
  sort_order: number;
}

export interface HHComputedWorker extends HHWorkerRow {
  cost_per_hour: number;
  monthly_cost: number;
  economic_result_per_hour: number;
  details: ReturnType<typeof calculateWorkerHH>;
}

export async function loadHHData() {
  const [settingsRows, workersRows, fixedCostsRows, clientRows, hourTypes] = await Promise.all([
    sql`SELECT * FROM hh_settings WHERE id = 1 LIMIT 1`,
    sql`
      SELECT wt.id::int AS id, wt.worker_id, wt.name, wt.icon,
             COALESCE(hws.salary_base, 0) AS salary_base
      FROM worker_types wt
      LEFT JOIN hh_worker_salaries hws ON hws.worker_id = wt.worker_id
      ORDER BY wt.name
    `,
    sql`
      SELECT id::int AS id, name, amount, sort_order
      FROM hh_fixed_costs
      ORDER BY sort_order, id
    `,
    sql`
      SELECT id::int AS id, client_id, name, dias::int AS dias,
             negotiation_pct, iss_retained_pct, inss_retained_pct,
             anticipate, active
      FROM labor_clients
      ORDER BY id
    `,
    sql`
      SELECT id::int AS id, hour_id, name, multiplier
      FROM hour_types
      ORDER BY multiplier
    `,
  ]);

  if (!settingsRows[0]) {
    throw new Error('Parâmetros HH não encontrados no banco.');
  }

  const settings = settingsRows[0] as unknown as HHSettings;
  const workers = workersRows as unknown as HHWorkerRow[];
  const fixedCosts = fixedCostsRows as unknown as HHFixedCostRow[];
  const clients = clientRows as unknown as Array<HHClientTerms & { id: number }>;
  const fixedCostTotal = fixedCosts.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const computedWorkers = workers.map((worker) => {
    const details = calculateWorkerHH(
      { worker_id: worker.worker_id, salary_base: Number(worker.salary_base || 0) },
      settings,
      fixedCostTotal
    );
    return {
      ...worker,
      salary_base: Number(worker.salary_base || 0),
      cost_per_hour: roundMoney(details.cost_per_hour),
      monthly_cost: roundMoney(details.monthly_cost),
      economic_result_per_hour: 0,
      details,
    } satisfies HHComputedWorker;
  });

  const rates = computedWorkers.flatMap((worker) =>
    clients.map((client) => {
      const price = calculateHHPrice(worker.details.cost_per_hour, settings, client);
      return {
        id: 0,
        worker_id: worker.worker_id,
        client_id: client.client_id,
        rate: roundMoney(client.active === false ? 0 : price.offer_price_per_hour),
        base_rate: roundMoney(price.base_price_per_hour),
        economic_result: roundMoney(price.economic_result_per_hour),
      };
    })
  );

  const workerWithResult = computedWorkers.map((worker) => {
    const activeClient = clients.find((c) => c.active !== false);
    const result = activeClient
      ? calculateHHPrice(worker.details.cost_per_hour, settings, activeClient)
      : null;
    return {
      ...worker,
      economic_result_per_hour: roundMoney(result?.economic_result_per_hour ?? 0),
    };
  });

  return {
    settings,
    fixedCosts,
    fixedCostTotal: roundMoney(fixedCostTotal),
    workers: workerWithResult,
    clients,
    hourTypes,
    rates,
  };
}

export async function syncHHMaterializedValues() {
  const data = await loadHHData();

  for (const worker of data.workers) {
    await sql`
      UPDATE worker_types
      SET custo_hora = ${worker.cost_per_hour},
          lucro_hora = ${worker.economic_result_per_hour},
          updated_at = to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS')
      WHERE worker_id = ${worker.worker_id}
    `;
  }

  for (const rate of data.rates) {
    // Keep the legacy/test client as historical-only. Its old rows are not a
    // current commercial source and must not be regenerated.
    if (rate.client_id === '0%') continue;
    await sql`
      INSERT INTO worker_rates (worker_id, client_id, rate, created_at, updated_at)
      VALUES (
        ${rate.worker_id}, ${rate.client_id}, ${rate.rate},
        to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS'),
        to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS')
      )
      ON CONFLICT (worker_id, client_id) DO UPDATE
      SET rate = EXCLUDED.rate,
          updated_at = EXCLUDED.updated_at
    `;
  }

  return data;
}
