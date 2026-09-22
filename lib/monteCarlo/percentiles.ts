import type { ScenarioPoint } from "./types";

export function percentile(values: ArrayLike<number>, probability: number): number {
  if (values.length === 0) {
    throw new RangeError("Невозможно рассчитать перцентиль для пустого набора.");
  }

  const sorted = Array.from(values).sort((left, right) => left - right);
  const rank = (sorted.length - 1) * probability;
  const lowerIndex = Math.floor(rank);
  const upperIndex = Math.ceil(rank);

  if (lowerIndex === upperIndex) {
    return sorted[lowerIndex];
  }

  const weight = rank - lowerIndex;
  return sorted[lowerIndex] * (1 - weight) + sorted[upperIndex] * weight;
}

export function scenarioPoint(year: number, balances: ArrayLike<number>): ScenarioPoint {
  return {
    year,
    p20: percentile(balances, 0.2),
    p50: percentile(balances, 0.5),
    p80: percentile(balances, 0.8),
  };
}
