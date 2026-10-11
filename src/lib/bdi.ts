export interface BDIConfig {
  das: number;
  lucro: number;
  jurosDia: number;
  trocaNota: number;
  descontoCompras: number;
  issRetido: number;
  inssRetido: number;
  anticipate: boolean;
}

export interface Client {
  id: string;
  name: string;
  diasPagamento: number;
}

export const DEFAULT_BDI_CONFIG: BDIConfig = {
  das: 10.81,
  lucro: 10,
  jurosDia: 0.1,
  trocaNota: 0,
  descontoCompras: 0,
  issRetido: 4.36,
  inssRetido: 0,
  anticipate: true,
};

// Kept only as a legacy-state bootstrap. New pricing screens read the official
// client list from Neon through usePriceTable.
export const DEFAULT_CLIENTS: Client[] = [
  { id: "jbs", name: "JBS", diasPagamento: 120 },
  { id: "vibra", name: "Vibra", diasPagamento: 30 },
  { id: "brf", name: "BRF", diasPagamento: 180 },
];

/**
 * Price a direct project expense without double-counting retained taxes.
 *
 * - DAS is the economic tax burden.
 * - ISS retention reduces cash received but is part of DAS, not an extra tax.
 * - INSS retention is treated as cash-flow/compensable, not a new cost.
 * - Financing uses the actual receivable after retentions.
 * - Commercial discount/negotiation is grossed up at the end so applying that
 *   discount returns to the calculated base price.
 */
export function calculateBDIPrice(
  baseCost: number,
  diasPagamento: number,
  config: BDIConfig = DEFAULT_BDI_CONFIG
): number {
  if (baseCost <= 0) return 0;

  const das = Math.max(0, config.das) / 100;
  const lucro = Math.max(0, config.lucro) / 100;
  const trocaNota = Math.max(0, config.trocaNota) / 100;
  const iss = Math.max(0, config.issRetido) / 100;
  const inss = Math.max(0, config.inssRetido) / 100;
  const negotiation = Math.min(0.95, Math.max(0, config.descontoCompras / 100));
  const receivableFraction = Math.max(0, 1 - iss - inss);
  const financeRate = config.anticipate
    ? Math.max(0, diasPagamento) * (Math.max(0, config.jurosDia) / 100)
    : 0;

  const divisor = 1 - das - lucro - trocaNota - financeRate * receivableFraction;
  if (divisor <= 0) return 0;

  const basePrice = baseCost / divisor;
  return negotiation < 1 ? basePrice / (1 - negotiation) : 0;
}

export function getBDIFactor(
  diasPagamento: number,
  config: BDIConfig = DEFAULT_BDI_CONFIG
): number {
  return calculateBDIPrice(1, diasPagamento, config);
}

export const formatCurrency = (value: number): string =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
