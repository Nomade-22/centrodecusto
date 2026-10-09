BEGIN;

CREATE TABLE IF NOT EXISTS hh_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  salary_minimum double precision NOT NULL DEFAULT 1621,
  prize double precision NOT NULL DEFAULT 380,
  prize_in_charges boolean NOT NULL DEFAULT false,
  insalubrity_pct double precision NOT NULL DEFAULT 20,
  monthly_hours double precision NOT NULL DEFAULT 220,
  productive_employees integer NOT NULL DEFAULT 6,
  employer_inss_rat_fap_pct double precision NOT NULL DEFAULT 24.8516,
  fgts_pct double precision NOT NULL DEFAULT 8,
  fgts_fine_pct double precision NOT NULL DEFAULT 40,
  das_effective_pct double precision NOT NULL DEFAULT 10.81,
  default_iss_retained_pct double precision NOT NULL DEFAULT 4.36,
  default_inss_retained_pct double precision NOT NULL DEFAULT 0,
  markup_pct double precision NOT NULL DEFAULT 30,
  anticipation_daily_pct double precision NOT NULL DEFAULT 0.1,
  epi_monthly double precision NOT NULL DEFAULT 37.375,
  exams_monthly double precision NOT NULL DEFAULT 28.25,
  tools_monthly double precision NOT NULL DEFAULT 300,
  health_monthly double precision NOT NULL DEFAULT 15,
  lunch_monthly double precision NOT NULL DEFAULT 0,
  transport_monthly double precision NOT NULL DEFAULT 0,
  insurance_total_monthly double precision NOT NULL DEFAULT 792.69,
  training_annual double precision NOT NULL DEFAULT 380,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO hh_settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS hh_worker_salaries (
  worker_id text PRIMARY KEY REFERENCES worker_types(worker_id) ON UPDATE CASCADE ON DELETE CASCADE,
  salary_base double precision NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO hh_worker_salaries (worker_id, salary_base) VALUES
  ('caldereiro', 2703.26),
  ('pedreiro', 2330.79),
  ('servente', 1933.47),
  ('meio-oficial', 1984.29),
  ('serralheiro', 3150.00),
  ('soldador', 3150.00),
  ('supervisor', 2717.19)
ON CONFLICT (worker_id) DO UPDATE
SET salary_base = EXCLUDED.salary_base, updated_at = now();

CREATE TABLE IF NOT EXISTS hh_fixed_costs (
  id bigserial PRIMARY KEY,
  name text NOT NULL,
  amount double precision NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO hh_fixed_costs (name, amount, sort_order)
SELECT * FROM (VALUES
  ('Aluguel', 6000.00::double precision, 10),
  ('Água', 0.00::double precision, 20),
  ('Luz', 700.00::double precision, 30),
  ('Internet', 100.00::double precision, 40),
  ('Assessoria', 2500.00::double precision, 50),
  ('HGM', 304.00::double precision, 60),
  ('EML', 3000.00::double precision, 70),
  ('Retiradas Administrativas', 14000.00::double precision, 80),
  ('Manut. Carros', 300.00::double precision, 90),
  ('ISEG', 710.00::double precision, 100),
  ('Higiene', 80.00::double precision, 110),
  ('ACI', 125.00::double precision, 120),
  ('Santander', 240.00::double precision, 130),
  ('Protej', 116.00::double precision, 140),
  ('Ponto Web', 125.00::double precision, 150)
) AS seed(name, amount, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM hh_fixed_costs);

ALTER TABLE labor_clients ADD COLUMN IF NOT EXISTS negotiation_pct double precision NOT NULL DEFAULT 8;
ALTER TABLE labor_clients ADD COLUMN IF NOT EXISTS iss_retained_pct double precision NOT NULL DEFAULT 4.36;
ALTER TABLE labor_clients ADD COLUMN IF NOT EXISTS inss_retained_pct double precision NOT NULL DEFAULT 0;
ALTER TABLE labor_clients ADD COLUMN IF NOT EXISTS anticipate boolean NOT NULL DEFAULT true;
ALTER TABLE labor_clients ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

UPDATE labor_clients SET dias = 120, negotiation_pct = 12 WHERE client_id = 'jbs';
UPDATE labor_clients SET dias = 10, negotiation_pct = 12 WHERE client_id = 'couros';
UPDATE labor_clients SET dias = 180, negotiation_pct = 8 WHERE client_id = 'brf';
UPDATE labor_clients SET dias = 30, negotiation_pct = 8 WHERE client_id = 'vibra';
UPDATE labor_clients SET dias = 35, negotiation_pct = 8 WHERE client_id = 'agrogen';
UPDATE labor_clients SET dias = 45, negotiation_pct = 8 WHERE client_id = 'migplus';
UPDATE labor_clients SET dias = 5, negotiation_pct = 8 WHERE client_id = 'sbe';
UPDATE labor_clients SET active = false WHERE client_id = '0%';

INSERT INTO labor_clients (
  client_id, name, dias, created_at, updated_at,
  negotiation_pct, iss_retained_pct, inss_retained_pct, anticipate, active
)
VALUES
  (
    'seara', 'Seara', 120,
    to_char(now() AT TIME ZONE 'UTC','YYYY-MM-DD HH24:MI:SS'),
    to_char(now() AT TIME ZONE 'UTC','YYYY-MM-DD HH24:MI:SS'),
    8, 4.36, 0, true, true
  ),
  (
    'sbe-avista', 'SBE', 0,
    to_char(now() AT TIME ZONE 'UTC','YYYY-MM-DD HH24:MI:SS'),
    to_char(now() AT TIME ZONE 'UTC','YYYY-MM-DD HH24:MI:SS'),
    8, 4.36, 0, false, true
  )
ON CONFLICT (client_id) DO UPDATE SET
  name = EXCLUDED.name,
  dias = EXCLUDED.dias,
  negotiation_pct = EXCLUDED.negotiation_pct,
  iss_retained_pct = EXCLUDED.iss_retained_pct,
  inss_retained_pct = EXCLUDED.inss_retained_pct,
  anticipate = EXCLUDED.anticipate,
  active = EXCLUDED.active;

UPDATE worker_types
SET name = 'Mecânico Caldeireiro'
WHERE worker_id = 'caldereiro';

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
  (
    CASE
      WHEN c.anticipate THEN c.dias * cfg.anticipation_daily_pct / 100.0
      ELSE 0
    END
  ) AS anticipation_rate,
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

SELECT refresh_hh_derived_values();

COMMIT;
