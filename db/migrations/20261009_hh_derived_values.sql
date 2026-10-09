BEGIN;

CREATE OR REPLACE VIEW v_hh_worker_costs AS
WITH cfg AS (
  SELECT
    s.*,
    COALESCE((SELECT SUM(amount) FROM hh_fixed_costs), 0)::double precision AS fixed_cost_total
  FROM hh_settings s
  WHERE s.id = 1
),
calc AS (
  SELECT
    w.worker_id,
    w.name,
    w.icon,
    sal.salary_base,
    cfg.salary_minimum,
    cfg.insalubrity_pct,
    cfg.prize,
    cfg.monthly_hours,
    cfg.productive_employees,
    cfg.employer_inss_rat_fap_pct,
    cfg.fgts_pct,
    cfg.fgts_fine_pct,
    cfg.markup_pct,
    cfg.epi_monthly,
    cfg.exams_monthly,
    cfg.tools_monthly,
    cfg.health_monthly,
    cfg.lunch_monthly,
    cfg.transport_monthly,
    cfg.insurance_total_monthly,
    cfg.training_annual,
    cfg.fixed_cost_total,
    (cfg.salary_minimum * cfg.insalubrity_pct / 100.0) AS insalubrity_value
  FROM worker_types w
  JOIN hh_worker_salaries sal ON sal.worker_id = w.worker_id
  CROSS JOIN cfg
),
provisions AS (
  SELECT
    *,
    (salary_base + insalubrity_value) AS charges_base,
    ((salary_base + insalubrity_value) / 12.0) AS vacation_provision,
    (((salary_base + insalubrity_value) / 12.0) / 3.0) AS vacation_third,
    ((salary_base + insalubrity_value) / 12.0) AS thirteenth_provision
  FROM calc
),
loaded AS (
  SELECT
    *,
    (vacation_provision + vacation_third) AS vacation_with_third,
    (
      charges_base +
      vacation_provision + vacation_third +
      thirteenth_provision
    ) * fgts_pct / 100.0 AS fgts_total,
    (
      charges_base +
      vacation_provision + vacation_third +
      thirteenth_provision
    ) * employer_inss_rat_fap_pct / 100.0 AS employer_charges
  FROM provisions
)
SELECT
  worker_id,
  name,
  icon,
  salary_base,
  insalubrity_value,
  charges_base,
  vacation_with_third,
  thirteenth_provision,
  fgts_total,
  employer_charges,
  (fgts_total * fgts_fine_pct / 100.0) AS termination_provision,
  prize,
  epi_monthly,
  exams_monthly,
  tools_monthly,
  health_monthly,
  lunch_monthly,
  transport_monthly,
  (fixed_cost_total / NULLIF(productive_employees, 0)) AS fixed_cost_per_employee,
  (insurance_total_monthly / NULLIF(productive_employees, 0)) AS insurance_per_employee,
  (training_annual / 12.0) AS training_monthly,
  (
    charges_base +
    prize +
    vacation_with_third +
    thirteenth_provision +
    fgts_total +
    employer_charges +
    (fgts_total * fgts_fine_pct / 100.0) +
    epi_monthly +
    exams_monthly +
    tools_monthly +
    health_monthly +
    lunch_monthly +
    transport_monthly +
    (fixed_cost_total / NULLIF(productive_employees, 0)) +
    (insurance_total_monthly / NULLIF(productive_employees, 0)) +
    (training_annual / 12.0)
  ) AS monthly_loaded_cost,
  (
    (
      charges_base +
      prize +
      vacation_with_third +
      thirteenth_provision +
      fgts_total +
      employer_charges +
      (fgts_total * fgts_fine_pct / 100.0) +
      epi_monthly +
      exams_monthly +
      tools_monthly +
      health_monthly +
      lunch_monthly +
      transport_monthly +
      (fixed_cost_total / NULLIF(productive_employees, 0)) +
      (insurance_total_monthly / NULLIF(productive_employees, 0)) +
      (training_annual / 12.0)
    ) / NULLIF(monthly_hours, 0)
  ) AS cost_per_hour,
  markup_pct
FROM loaded;

CREATE OR REPLACE VIEW v_hh_rates AS
WITH cfg AS (
  SELECT * FROM hh_settings WHERE id = 1
)
SELECT
  wc.worker_id,
  wc.name AS worker_name,
  c.client_id,
  c.name AS client_name,
  c.dias,
  c.negotiation_pct,
  c.iss_retained_pct,
  c.inss_retained_pct,
  c.anticipate,
  wc.cost_per_hour,
  wc.markup_pct,
  (wc.cost_per_hour * (1 + wc.markup_pct / 100.0)) AS cost_with_markup,
  CASE
    WHEN c.anticipate THEN c.dias * cfg.anticipation_daily_pct / 100.0
    ELSE 0
  END AS anticipation_rate,
  (1 - (c.iss_retained_pct + c.inss_retained_pct) / 100.0) AS receivable_fraction,
  (
    1
    - cfg.das_effective_pct / 100.0
    - (
        CASE
          WHEN c.anticipate THEN c.dias * cfg.anticipation_daily_pct / 100.0
          ELSE 0
        END
        * (1 - (c.iss_retained_pct + c.inss_retained_pct) / 100.0)
      )
  ) AS pricing_divisor,
  (
    (wc.cost_per_hour * (1 + wc.markup_pct / 100.0))
    /
    NULLIF(
      1
      - cfg.das_effective_pct / 100.0
      - (
          CASE
            WHEN c.anticipate THEN c.dias * cfg.anticipation_daily_pct / 100.0
            ELSE 0
          END
          * (1 - (c.iss_retained_pct + c.inss_retained_pct) / 100.0)
        ),
      0
    )
  ) AS base_hour_price,
  (
    (
      (wc.cost_per_hour * (1 + wc.markup_pct / 100.0))
      /
      NULLIF(
        1
        - cfg.das_effective_pct / 100.0
        - (
            CASE
              WHEN c.anticipate THEN c.dias * cfg.anticipation_daily_pct / 100.0
              ELSE 0
            END
            * (1 - (c.iss_retained_pct + c.inss_retained_pct) / 100.0)
          ),
        0
      )
    )
    /
    NULLIF(1 - c.negotiation_pct / 100.0, 0)
  ) AS offer_hour_price
FROM v_hh_worker_costs wc
CROSS JOIN labor_clients c
CROSS JOIN cfg
WHERE c.active = true;

-- Sincronização inicial para manter compatibilidade com o frontend legado.
UPDATE worker_types w
SET
  custo_hora = ROUND(v.cost_per_hour::numeric, 2)::double precision,
  lucro_hora = ROUND((v.cost_per_hour * v.markup_pct / 100.0)::numeric, 2)::double precision,
  updated_at = to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS')
FROM v_hh_worker_costs v
WHERE v.worker_id = w.worker_id;

INSERT INTO worker_rates (worker_id, client_id, rate, created_at, updated_at)
SELECT
  v.worker_id,
  v.client_id,
  ROUND(v.offer_hour_price::numeric, 2)::double precision,
  to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS'),
  to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS')
FROM v_hh_rates v
ON CONFLICT (worker_id, client_id) DO UPDATE
SET rate = EXCLUDED.rate,
    updated_at = EXCLUDED.updated_at;

CREATE OR REPLACE FUNCTION refresh_hh_derived_values()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE worker_types w
  SET
    custo_hora = ROUND(v.cost_per_hour::numeric, 2)::double precision,
    lucro_hora = ROUND((v.cost_per_hour * v.markup_pct / 100.0)::numeric, 2)::double precision,
    updated_at = to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS')
  FROM v_hh_worker_costs v
  WHERE v.worker_id = w.worker_id;

  INSERT INTO worker_rates (worker_id, client_id, rate, created_at, updated_at)
  SELECT
    v.worker_id,
    v.client_id,
    ROUND(v.offer_hour_price::numeric, 2)::double precision,
    to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS'),
    to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS')
  FROM v_hh_rates v
  ON CONFLICT (worker_id, client_id) DO UPDATE
  SET rate = EXCLUDED.rate,
      updated_at = EXCLUDED.updated_at;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_refresh_hh_settings ON hh_settings;
CREATE TRIGGER trg_refresh_hh_settings
AFTER INSERT OR UPDATE OR DELETE ON hh_settings
FOR EACH STATEMENT EXECUTE FUNCTION refresh_hh_derived_values();

DROP TRIGGER IF EXISTS trg_refresh_hh_salaries ON hh_worker_salaries;
CREATE TRIGGER trg_refresh_hh_salaries
AFTER INSERT OR UPDATE OR DELETE ON hh_worker_salaries
FOR EACH STATEMENT EXECUTE FUNCTION refresh_hh_derived_values();

DROP TRIGGER IF EXISTS trg_refresh_hh_fixed_costs ON hh_fixed_costs;
CREATE TRIGGER trg_refresh_hh_fixed_costs
AFTER INSERT OR UPDATE OR DELETE ON hh_fixed_costs
FOR EACH STATEMENT EXECUTE FUNCTION refresh_hh_derived_values();

DROP TRIGGER IF EXISTS trg_refresh_hh_clients ON labor_clients;
CREATE TRIGGER trg_refresh_hh_clients
AFTER INSERT OR UPDATE OR DELETE ON labor_clients
FOR EACH STATEMENT EXECUTE FUNCTION refresh_hh_derived_values();

COMMIT;
