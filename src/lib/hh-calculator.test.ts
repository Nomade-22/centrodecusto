import { describe, expect, it } from 'vitest';
import { calculateHHPrice, calculateWorkerHH, roundMoney, type HHSettings } from './hh-calculator';

const settings: HHSettings = {
  salary_minimum: 1621,
  prize: 380,
  prize_in_charges: false,
  insalubrity_pct: 20,
  monthly_hours: 220,
  productive_employees: 6,
  employer_inss_rat_fap_pct: 24.8516,
  fgts_pct: 8,
  fgts_fine_pct: 40,
  das_effective_pct: 10.81,
  default_iss_retained_pct: 4.36,
  default_inss_retained_pct: 0,
  markup_pct: 30,
  anticipation_daily_pct: 0.1,
  epi_monthly: 37.375,
  exams_monthly: 28.25,
  tools_monthly: 300,
  health_monthly: 15,
  lunch_monthly: 0,
  transport_monthly: 0,
  insurance_total_monthly: 792.69,
  training_annual: 380,
};

const pedreiro = calculateWorkerHH(
  { worker_id: 'pedreiro', salary_base: 2330.79 },
  settings,
  28300
);

describe('Calculadora HH 2026', () => {
  it('mantém o custo auditado do Pedreiro', () => {
    expect(roundMoney(pedreiro.monthly_cost)).toBe(9955.59);
    expect(roundMoney(pedreiro.cost_per_hour)).toBe(45.25);
  });

  it.each([
    ['JBS', 120, 12, 86.02],
    ['BRF', 180, 8, 88.84],
    ['VIBRA', 30, 8, 74.08],
  ])('mantém o preço auditado de Pedreiro para %s', (name, dias, negotiation, expected) => {
    const price = calculateHHPrice(pedreiro.cost_per_hour, settings, {
      client_id: String(name).toLowerCase(),
      name: String(name),
      dias: Number(dias),
      negotiation_pct: Number(negotiation),
      iss_retained_pct: 4.36,
      inss_retained_pct: 0,
      anticipate: true,
      active: true,
    });

    expect(roundMoney(price.offer_price_per_hour)).toBe(expected);
  });

  it('não soma ISS retido por fora do DAS', () => {
    const price = calculateHHPrice(pedreiro.cost_per_hour, settings, {
      client_id: 'jbs',
      name: 'JBS',
      dias: 120,
      negotiation_pct: 12,
      iss_retained_pct: 4.36,
      inss_retained_pct: 0,
      anticipate: true,
      active: true,
    });

    expect(roundMoney(price.das_per_hour)).toBe(
      roundMoney(price.das_cash_payment_per_hour + price.iss_retained_per_hour)
    );
  });
  it('mantém as 220 horas como divisor, sem recalcular horas vendáveis', () => {
    expect(roundMoney(pedreiro.monthly_cost / settings.monthly_hours)).toBe(
      roundMoney(pedreiro.cost_per_hour)
    );
  });

  it('rateia os custos fixos pela quantidade de funcionários produtivos', () => {
    const withEight = calculateWorkerHH(
      { worker_id: 'pedreiro', salary_base: 2330.79 },
      { ...settings, productive_employees: 8 },
      28300
    );
    expect(roundMoney(pedreiro.fixed_cost_share)).toBe(roundMoney(28300 / 6));
    expect(roundMoney(withEight.fixed_cost_share)).toBe(roundMoney(28300 / 8));
    expect(withEight.cost_per_hour).toBeLessThan(pedreiro.cost_per_hour);
  });

  it('não aplica encargos ao prêmio se o campo estiver desligado', () => {
    const higherPrize = calculateWorkerHH(
      { worker_id: 'pedreiro', salary_base: 2330.79 },
      { ...settings, prize: 480, prize_in_charges: false },
      28300
    );
    expect(roundMoney(higherPrize.monthly_cost - pedreiro.monthly_cost)).toBe(100);
  });

  it('aplica o desconto de negociação depois da formação do preço-base', () => {
    const p = calculateHHPrice(pedreiro.cost_per_hour, settings, {
      client_id: 'jbs', name: 'JBS', dias: 120, negotiation_pct: 12,
      iss_retained_pct: 4.36, inss_retained_pct: 0, anticipate: true
    });
    expect(roundMoney(p.offer_price_per_hour * (1 - 0.12))).toBe(
      roundMoney(p.base_price_per_hour)
    );
  });

  it('trata o INSS retido como fluxo de caixa e não novo imposto econômico', () => {
    const baseClient = {
      client_id: 'couros', name: 'JBS Couros', dias: 10, negotiation_pct: 0,
      iss_retained_pct: 4.36, anticipate: false
    };
    const withoutRetention = calculateHHPrice(pedreiro.cost_per_hour, settings, {
      ...baseClient, inss_retained_pct: 0
    });
    const withRetention = calculateHHPrice(pedreiro.cost_per_hour, settings, {
      ...baseClient, inss_retained_pct: 11
    });
    expect(withRetention.base_price_per_hour).toBeCloseTo(withoutRetention.base_price_per_hour, 8);
    expect(withRetention.economic_result_per_hour).toBeCloseTo(
      withoutRetention.economic_result_per_hour, 8
    );
    expect(withRetention.net_receivable_per_hour).toBeLessThan(
      withoutRetention.net_receivable_per_hour
    );
  });

  it('cobra antecipação apenas sobre o recebível líquido das retenções', () => {
    const price = calculateHHPrice(pedreiro.cost_per_hour, settings, {
      client_id: 'jbs', name: 'JBS', dias: 120, negotiation_pct: 12,
      iss_retained_pct: 4.36, inss_retained_pct: 11, anticipate: true
    });
    expect(price.anticipation_cost_per_hour).toBeCloseTo(
      price.net_receivable_per_hour * 0.001 * 120, 8
    );
  });

  it('usa o prazo do cliente apenas quando antecipação estiver habilitada', () => {
    const baseClient = {
      client_id: 'brf', name: 'BRF', negotiation_pct: 8,
      iss_retained_pct: 4.36, inss_retained_pct: 0
    };
    const thirty = calculateHHPrice(pedreiro.cost_per_hour, settings, {
      ...baseClient, dias: 30, anticipate: true
    });
    const oneEighty = calculateHHPrice(pedreiro.cost_per_hour, settings, {
      ...baseClient, dias: 180, anticipate: true
    });
    const noAdvance = calculateHHPrice(pedreiro.cost_per_hour, settings, {
      ...baseClient, dias: 180, anticipate: false
    });
    expect(oneEighty.base_price_per_hour).toBeGreaterThan(thirty.base_price_per_hour);
    expect(noAdvance.anticipation_cost_per_hour).toBe(0);
  });

});
