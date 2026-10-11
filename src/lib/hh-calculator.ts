export interface HHSettings {
  id?: number;
  salary_minimum: number;
  prize: number;
  prize_in_charges: boolean;
  insalubrity_pct: number;
  monthly_hours: number;
  productive_employees: number;
  employer_inss_rat_fap_pct: number;
  fgts_pct: number;
  fgts_fine_pct: number;
  das_effective_pct: number;
  default_iss_retained_pct: number;
  default_inss_retained_pct: number;
  markup_pct: number;
  anticipation_daily_pct: number;
  epi_monthly: number;
  exams_monthly: number;
  tools_monthly: number;
  health_monthly: number;
  lunch_monthly: number;
  transport_monthly: number;
  insurance_total_monthly: number;
  training_annual: number;
}

export interface HHClientTerms {
  client_id: string;
  name: string;
  dias: number;
  negotiation_pct: number;
  iss_retained_pct: number;
  inss_retained_pct: number;
  anticipate: boolean;
  active?: boolean;
}

export interface HHWorkerInput {
  worker_id: string;
  salary_base: number;
}

export interface HHWorkerResult {
  worker_id: string;
  salary_base: number;
  insalubrity: number;
  base_encargos: number;
  ferias: number;
  terco_ferias: number;
  ferias_com_terco: number;
  decimo_terceiro: number;
  fgts: number;
  employer_inss_rat_fap: number;
  severance_reserve: number;
  fixed_cost_share: number;
  insurance_share: number;
  training_monthly: number;
  monthly_cost: number;
  cost_per_hour: number;
}

export interface HHPriceResult {
  base_price_per_hour: number;
  offer_price_per_hour: number;
  economic_result_per_hour: number;
  das_per_hour: number;
  iss_retained_per_hour: number;
  inss_retained_per_hour: number;
  net_receivable_per_hour: number;
  anticipation_cost_per_hour: number;
  das_cash_payment_per_hour: number;
}

const pct = (value: number) => value / 100;
const safe = (value: unknown, fallback = 0) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

export function calculateWorkerHH(
  worker: HHWorkerInput,
  settings: HHSettings,
  fixedCostTotal: number
): HHWorkerResult {
  const salary = Math.max(0, safe(worker.salary_base));
  const minimum = Math.max(0, safe(settings.salary_minimum));
  const insalubrity = minimum * pct(Math.max(0, safe(settings.insalubrity_pct)));
  const baseEncargos = salary + insalubrity;

  const ferias = baseEncargos / 12;
  const tercoFerias = ferias / 3;
  const feriasComTerco = ferias + tercoFerias;
  const decimoTerceiro = baseEncargos / 12;
  const payrollIncidenceBase = baseEncargos + feriasComTerco + decimoTerceiro;

  const fgts = payrollIncidenceBase * pct(Math.max(0, safe(settings.fgts_pct)));
  const employerInssRatFap =
    payrollIncidenceBase * pct(Math.max(0, safe(settings.employer_inss_rat_fap_pct)));
  const severanceReserve = fgts * pct(Math.max(0, safe(settings.fgts_fine_pct)));

  const employeeCount = Math.max(1, Math.round(safe(settings.productive_employees, 1)));
  const fixedCostShare = Math.max(0, safe(fixedCostTotal)) / employeeCount;
  const insuranceShare = Math.max(0, safe(settings.insurance_total_monthly)) / employeeCount;
  const trainingMonthly = Math.max(0, safe(settings.training_annual)) / 12;

  const directMonthly =
    Math.max(0, safe(settings.epi_monthly)) +
    Math.max(0, safe(settings.exams_monthly)) +
    Math.max(0, safe(settings.tools_monthly)) +
    Math.max(0, safe(settings.health_monthly)) +
    Math.max(0, safe(settings.lunch_monthly)) +
    Math.max(0, safe(settings.transport_monthly));

  const prize = Math.max(0, safe(settings.prize));
  const prizeCharge = settings.prize_in_charges
    ? prize *
      (pct(Math.max(0, safe(settings.fgts_pct))) +
        pct(Math.max(0, safe(settings.employer_inss_rat_fap_pct))))
    : 0;

  const monthlyCost =
    baseEncargos +
    prize +
    feriasComTerco +
    decimoTerceiro +
    fgts +
    employerInssRatFap +
    severanceReserve +
    prizeCharge +
    directMonthly +
    fixedCostShare +
    insuranceShare +
    trainingMonthly;

  const monthlyHours = Math.max(1, safe(settings.monthly_hours, 220));

  return {
    worker_id: worker.worker_id,
    salary_base: salary,
    insalubrity,
    base_encargos: baseEncargos,
    ferias,
    terco_ferias: tercoFerias,
    ferias_com_terco: feriasComTerco,
    decimo_terceiro: decimoTerceiro,
    fgts,
    employer_inss_rat_fap: employerInssRatFap,
    severance_reserve: severanceReserve,
    fixed_cost_share: fixedCostShare,
    insurance_share: insuranceShare,
    training_monthly: trainingMonthly,
    monthly_cost: monthlyCost,
    cost_per_hour: monthlyCost / monthlyHours,
  };
}

export function calculateHHPrice(
  costPerHour: number,
  settings: HHSettings,
  client: HHClientTerms
): HHPriceResult {
  const cost = Math.max(0, safe(costPerHour));
  const markup = pct(Math.max(0, safe(settings.markup_pct)));
  const dasRate = pct(Math.max(0, safe(settings.das_effective_pct)));
  const issRet = pct(Math.max(0, safe(client.iss_retained_pct)));
  const inssRet = pct(Math.max(0, safe(client.inss_retained_pct)));
  const negotiation = Math.min(0.95, Math.max(0, pct(safe(client.negotiation_pct))));
  const anticipationRate = client.anticipate
    ? Math.max(0, safe(client.dias)) * pct(Math.max(0, safe(settings.anticipation_daily_pct)))
    : 0;

  const receivableFraction = Math.max(0, 1 - issRet - inssRet);
  const divisor = 1 - dasRate - anticipationRate * receivableFraction;
  if (divisor <= 0) {
    return {
      base_price_per_hour: 0,
      offer_price_per_hour: 0,
      economic_result_per_hour: 0,
      das_per_hour: 0,
      iss_retained_per_hour: 0,
      inss_retained_per_hour: 0,
      net_receivable_per_hour: 0,
      anticipation_cost_per_hour: 0,
      das_cash_payment_per_hour: 0,
    };
  }

  const costWithMarkup = cost * (1 + markup);
  const basePrice = costWithMarkup / divisor;
  const offerPrice = negotiation < 1 ? basePrice / (1 - negotiation) : 0;

  const das = basePrice * dasRate;
  const issRetained = basePrice * issRet;
  const inssRetained = basePrice * inssRet;
  const netReceivable = basePrice - issRetained - inssRetained;
  const anticipationCost = netReceivable * anticipationRate;
  const dasCashPayment = basePrice * Math.max(0, dasRate - issRet);
  const economicResult = basePrice - das - anticipationCost - cost;

  return {
    base_price_per_hour: basePrice,
    offer_price_per_hour: offerPrice,
    economic_result_per_hour: economicResult,
    das_per_hour: das,
    iss_retained_per_hour: issRetained,
    inss_retained_per_hour: inssRetained,
    net_receivable_per_hour: netReceivable,
    anticipation_cost_per_hour: anticipationCost,
    das_cash_payment_per_hour: dasCashPayment,
  };
}

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
