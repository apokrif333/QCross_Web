import type { ModelAssumptions } from "./types";

export type ReturnAssumptionRow = {
  targetReturnPct: number;
  annualVolatilityPct: number;
  crisisDrawdownPct: number;
};

export const RETURN_ASSUMPTIONS: readonly ReturnAssumptionRow[] = [
  { targetReturnPct: 4, annualVolatilityPct: 3.0, crisisDrawdownPct: -5.0 },
  { targetReturnPct: 5, annualVolatilityPct: 4.5, crisisDrawdownPct: -8.5 },
  { targetReturnPct: 6, annualVolatilityPct: 4.8, crisisDrawdownPct: -8.4 },
  { targetReturnPct: 7, annualVolatilityPct: 6.0, crisisDrawdownPct: -11.0 },
  { targetReturnPct: 8, annualVolatilityPct: 8.0, crisisDrawdownPct: -16.0 },
  { targetReturnPct: 9, annualVolatilityPct: 10.8, crisisDrawdownPct: -23.4 },
  { targetReturnPct: 10, annualVolatilityPct: 13.5, crisisDrawdownPct: -30.5 },
  { targetReturnPct: 11, annualVolatilityPct: 15.0, crisisDrawdownPct: -34.0 },
  { targetReturnPct: 12, annualVolatilityPct: 18.0, crisisDrawdownPct: -42.0 },
  { targetReturnPct: 13, annualVolatilityPct: 21.0, crisisDrawdownPct: -50.0 },
  { targetReturnPct: 14, annualVolatilityPct: 24.0, crisisDrawdownPct: -58.0 },
  { targetReturnPct: 15, annualVolatilityPct: 27.0, crisisDrawdownPct: -66.0 },
  { targetReturnPct: 16, annualVolatilityPct: 30.0, crisisDrawdownPct: -74.0 },
  { targetReturnPct: 17, annualVolatilityPct: 33.0, crisisDrawdownPct: -82.0 },
  { targetReturnPct: 18, annualVolatilityPct: 36.0, crisisDrawdownPct: -90.0 },
  { targetReturnPct: 19, annualVolatilityPct: 39.0, crisisDrawdownPct: -98.0 },
  { targetReturnPct: 20, annualVolatilityPct: 42.0, crisisDrawdownPct: -106.0 },
  { targetReturnPct: 21, annualVolatilityPct: 45.0, crisisDrawdownPct: -114.0 },
  { targetReturnPct: 22, annualVolatilityPct: 48.0, crisisDrawdownPct: -122.0 },
  { targetReturnPct: 23, annualVolatilityPct: 51.0, crisisDrawdownPct: -130.0 },
  { targetReturnPct: 24, annualVolatilityPct: 54.0, crisisDrawdownPct: -138.0 },
  { targetReturnPct: 25, annualVolatilityPct: 57.0, crisisDrawdownPct: -146.0 },
  { targetReturnPct: 26, annualVolatilityPct: 60.0, crisisDrawdownPct: -154.0 },
  { targetReturnPct: 27, annualVolatilityPct: 63.0, crisisDrawdownPct: -162.0 },
  { targetReturnPct: 28, annualVolatilityPct: 66.0, crisisDrawdownPct: -170.0 },
  { targetReturnPct: 29, annualVolatilityPct: 69.0, crisisDrawdownPct: -178.0 },
  { targetReturnPct: 30, annualVolatilityPct: 72.0, crisisDrawdownPct: -186.0 },
  { targetReturnPct: 31, annualVolatilityPct: 75.0, crisisDrawdownPct: -194.0 },
  { targetReturnPct: 32, annualVolatilityPct: 78.0, crisisDrawdownPct: -202.0 },
  { targetReturnPct: 33, annualVolatilityPct: 81.0, crisisDrawdownPct: -210.0 },
  { targetReturnPct: 34, annualVolatilityPct: 84.0, crisisDrawdownPct: -218.0 },
  { targetReturnPct: 35, annualVolatilityPct: 87.0, crisisDrawdownPct: -226.0 },
  { targetReturnPct: 36, annualVolatilityPct: 90.0, crisisDrawdownPct: -234.0 },
  { targetReturnPct: 37, annualVolatilityPct: 93.0, crisisDrawdownPct: -242.0 },
  { targetReturnPct: 38, annualVolatilityPct: 96.0, crisisDrawdownPct: -250.0 },
  { targetReturnPct: 39, annualVolatilityPct: 99.0, crisisDrawdownPct: -258.0 },
  { targetReturnPct: 40, annualVolatilityPct: 102.0, crisisDrawdownPct: -266.0 },
] as const;

export function getModelAssumptions(targetReturnPct: number): ModelAssumptions {
  const row = RETURN_ASSUMPTIONS.find((candidate) => candidate.targetReturnPct === targetReturnPct);

  if (!row) {
    throw new RangeError(`Нет модельных предположений для доходности ${targetReturnPct}%.`);
  }

  return {
    annualReturn: row.targetReturnPct / 100,
    annualVolatility: row.annualVolatilityPct / 100,
    crisisDrawdown: row.crisisDrawdownPct / 100,
  };
}
