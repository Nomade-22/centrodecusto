/**
 * Negociação comercial na aba Material.
 * Percentual é DESCONTO possível sobre a oferta, não percentual somado
 * diretamente ao preço-base: oferta = base / (1 - desconto/100).
 * Valores de orçamentos antigos usam "descontoCompras" como fallback.
 */
export function clampMaterialNegotiationPct(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.min(95, Math.max(0, numeric));
}

export function effectiveMaterialNegotiationPct(
  clientPreset: unknown,
  itemOverride?: number | null,
  legacyGlobalOverride = 0,
): number {
  // Zero numérico significa negociação explicitamente desativada.
  if (typeof itemOverride === "number" && Number.isFinite(itemOverride)) {
    return clampMaterialNegotiationPct(itemOverride);
  }
  // Null marca um item novo ou restaurado ao padrão cadastrado.
  if (itemOverride === null) {
    return clampMaterialNegotiationPct(clientPreset);
  }
  // Apenas orçamentos antigos, sem campo itemOverride, usam o legado.
  if (legacyGlobalOverride > 0) {
    return clampMaterialNegotiationPct(legacyGlobalOverride);
  }
  return clampMaterialNegotiationPct(clientPreset);
}

export function materialOfferPrice(basePrice: number, discountPct: number): number {
  const pct = clampMaterialNegotiationPct(discountPct);
  return basePrice > 0 ? basePrice / (1 - pct / 100) : 0;
}

export function materialOfferMarkupPct(discountPct: number): number {
  const pct = clampMaterialNegotiationPct(discountPct);
  return 100 * (1 / (1 - pct / 100) - 1);
}
