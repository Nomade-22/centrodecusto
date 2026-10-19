import { describe, it, expect } from "vitest";
import {
  clampMaterialNegotiationPct,
  effectiveMaterialNegotiationPct,
  materialOfferMarkupPct,
  materialOfferPrice,
} from "./material-negotiation";

describe("Material — negociação por cliente", () => {
  it("mostra o percentual do cadastro quando não há alteração manual", () => {
    expect(effectiveMaterialNegotiationPct(12, null)).toBe(12);
    expect(effectiveMaterialNegotiationPct(8, null)).toBe(8);
    expect(effectiveMaterialNegotiationPct(0, null)).toBe(0);
  });

  it("permite alterar manualmente para 8%, 15% ou zero", () => {
    expect(effectiveMaterialNegotiationPct(12, 8)).toBe(8);
    expect(effectiveMaterialNegotiationPct(12, 15)).toBe(15);
    expect(effectiveMaterialNegotiationPct(12, 0)).toBe(0);
  });

  it("preserva negociação manual legada ao reabrir orçamento antigo", () => {
    expect(effectiveMaterialNegotiationPct(12, undefined, 6)).toBe(6);
    expect(effectiveMaterialNegotiationPct(12, null, 6)).toBe(12);
    expect(effectiveMaterialNegotiationPct(12, 0, 6)).toBe(0);
  });

  it("volta ao padrão após restaurar a negociação do cliente", () => {
    expect(effectiveMaterialNegotiationPct(8, null, 12)).toBe(8);
  });

  it("gross-up: desconto de 12% sobre oferta retorna ao preço-base", () => {
    const base = 10225.79;
    const offer = materialOfferPrice(base, 12);
    expect(offer * 0.88).toBeCloseTo(base, 8);
    expect(materialOfferMarkupPct(12)).toBeCloseTo(13.636363636, 7);
    expect(offer - base).toBeCloseTo(1394.425909, 5);
  });

  it("aceita 0%, limita percentuais inválidos e evita divisor zero", () => {
    expect(materialOfferPrice(1000, 0)).toBe(1000);
    expect(clampMaterialNegotiationPct(100)).toBe(95);
    expect(clampMaterialNegotiationPct(-10)).toBe(0);
    expect(clampMaterialNegotiationPct(Number.NaN)).toBe(0);
    expect(Number.isFinite(materialOfferPrice(1000, 100))).toBe(true);
  });

  it("permite itens simultâneos com clientes distintos e descontos próprios", () => {
    const base = 1000;
    const jbs = effectiveMaterialNegotiationPct(12, null);
    const vibra = effectiveMaterialNegotiationPct(8, 5);
    expect(materialOfferPrice(base, jbs)).toBeCloseTo(1136.36363636, 6);
    expect(materialOfferPrice(base, vibra)).toBeCloseTo(1052.63157895, 6);
  });
});
