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

-- Mantém o antigo cliente de teste apenas para compatibilidade com orçamentos históricos.
UPDATE labor_clients SET active = false WHERE client_id = '0%';

INSERT INTO labor_clients (
  client_id, name, dias, created_at, updated_at,
  negotiation_pct, iss_retained_pct, inss_retained_pct, anticipate, active
)
VALUES
  ('seara', 'Seara', 120,
   to_char(now() AT TIME ZONE 'UTC','YYYY-MM-DD HH24:MI:SS'),
   to_char(now() AT TIME ZONE 'UTC','YYYY-MM-DD HH24:MI:SS'),
   8, 4.36, 0, true, true),
  ('sbe-avista', 'SBE', 0,
   to_char(now() AT TIME ZONE 'UTC','YYYY-MM-DD HH24:MI:SS'),
   to_char(now() AT TIME ZONE 'UTC','YYYY-MM-DD HH24:MI:SS'),
   8, 4.36, 0, false, true)
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

COMMIT;
