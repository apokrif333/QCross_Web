import { describe, expect, it } from "vitest";
import { getModelAssumptions } from "../lib/monteCarlo/assumptions";
import { detectDrawdownEpisodes } from "../lib/monteCarlo/crisis";
import { buildRepresentativeScenario, runMonteCarlo, simulatePath } from "../lib/monteCarlo/engine";
import type { ModelAssumptions, SimulationInputs } from "../lib/monteCarlo/types";

const BASE_INPUTS: SimulationInputs = {
  initialCapital: 1_000_000,
  annualContribution: 100_000,
  horizonYears: 20,
  targetReturnPct: 10,
};

describe("таблица модельных предположений", () => {
  it.each([
    [4, 0.03, -0.05],
    [10, 0.135, -0.305],
    [20, 0.42, -1.06],
    [40, 1.02, -2.66],
  ])("возвращает точные значения для %i%%", (targetReturnPct, volatility, drawdown) => {
    expect(getModelAssumptions(targetReturnPct)).toMatchObject({
      annualReturn: targetReturnPct / 100,
      annualVolatility: volatility,
      crisisDrawdown: drawdown,
    });
  });
});

describe("денежные потоки", () => {
  it("добавляет ежегодное пополнение к фактической стоимости в конце года", () => {
    const inputs: SimulationInputs = {
      initialCapital: 100_000,
      annualContribution: 10_000,
      horizonYears: 2,
      targetReturnPct: 10,
    };
    const assumptions: ModelAssumptions = {
      annualReturn: 0.1,
      annualVolatility: 0,
      crisisDrawdown: -0.305,
    };
    const path = simulatePath(inputs, assumptions, () => 0);

    expect(path.yearEndBalances[0]).toBe(100_000);
    expect(path.yearEndBalances[1]).toBeCloseTo(120_000, 8);
    expect(path.yearEndBalances[2]).toBeCloseTo(142_000, 8);
  });
});

describe("выявление просадок", () => {
  it("фиксирует глубину, время до минимума и время восстановления", () => {
    const values = Float64Array.from([1, 1.1, 1, 0.85, 0.8, 0.92, 1.1]);
    const [episode] = detectDrawdownEpisodes(values);

    expect(episode.maximumDrawdown).toBeCloseTo(0.8 / 1.1 - 1, 12);
    expect(episode.timeToTroughMonths).toBe(3);
    expect(episode.timeToRecoveryMonths).toBe(5);
  });

  it("сохраняет невосстановленный эпизод до конца горизонта", () => {
    const values = Float64Array.from([1, 1.05, 0.85, 0.8, 0.9]);
    const [episode] = detectDrawdownEpisodes(values);

    expect(episode.timeToRecoveryMonths).toBeNull();
  });
});

describe("репрезентативные сценарии", () => {
  it("сохраняет заданную конечную стоимость после нанесения кризисов", () => {
    const targetTerminalBalance = 2_000_000;
    const path = buildRepresentativeScenario(
      { ...BASE_INPUTS, annualContribution: 0, horizonYears: 10 },
      targetTerminalBalance,
      [{ drawdown: -0.3, durationMonths: 8, crisisYear: 5 }],
    );

    expect(path.at(-1)).toBeCloseTo(targetTerminalBalance, 6);
  });

  it("показывает кризисную просадку до начисления калибровочного роста", () => {
    const path = buildRepresentativeScenario(
      { ...BASE_INPUTS, annualContribution: 0, horizonYears: 10 },
      2_000_000,
      [{ drawdown: -0.3, durationMonths: 6, crisisYear: 5 }],
    );

    expect(path[5]).toBeLessThan(path[4]);
    expect(path.at(-1)).toBeCloseTo(2_000_000, 6);
  });

  it("на кризисном году применяет просадку к прошлому балансу, затем добавляет пополнение", () => {
    const path = buildRepresentativeScenario(
      {
        initialCapital: 2_000_000,
        annualContribution: 100_000,
        horizonYears: 5,
        targetReturnPct: 8,
      },
      3_000_000,
      [{ drawdown: -0.2, durationMonths: 12, crisisYear: 1 }],
    );

    expect(path[1]).toBeCloseTo(1_700_000, 8);
  });
});

describe("результаты Монте-Карло", () => {
  it.each([
    [5, 1],
    [12, 2],
    [60, 12],
  ])("выбирает %i кризисных эпизодов для горизонта %i лет", (horizonYears, crisisCount) => {
    const result = runMonteCarlo(
      { ...BASE_INPUTS, horizonYears },
      { pathCount: 80, seed: 42 },
    );

    expect(result.crisisCount).toBe(crisisCount);
  });

  it("сохраняет порядок P20 <= P50 <= P80 на каждой годовой точке", () => {
    const result = runMonteCarlo(BASE_INPUTS, { pathCount: 500, seed: 42 });

    for (const point of result.points) {
      expect(point.p20).toBeLessThanOrEqual(point.p50);
      expect(point.p50).toBeLessThanOrEqual(point.p80);
    }

    expect(result.drawdownRange.positiveWeakest).not.toBeNull();
    expect(result.drawdownRange.negativeStrongest).not.toBeNull();
    expect(result.drawdownRange.positiveWeakest!).toBeGreaterThanOrEqual(
      result.drawdownRange.negativeStrongest!,
    );
    expect(result.scenarioAnnualizedReturns.positive).toBeGreaterThan(
      result.scenarioAnnualizedReturns.negative,
    );
  });

  it("не создаёт событий полной потери без отдельной jump/default-модели", () => {
    const result = runMonteCarlo(
      { ...BASE_INPUTS, targetReturnPct: 19 },
      { pathCount: 100, seed: 42 },
    );

    expect(result.ruinProbability).toBe(0);
  });

  it("учитывает ежегодные пополнения в отображаемом диапазоне просадок", () => {
    const withoutContributions = runMonteCarlo(
      { ...BASE_INPUTS, annualContribution: 0, horizonYears: 5, targetReturnPct: 8 },
      { pathCount: 500, seed: 42 },
    );
    const withContributions = runMonteCarlo(
      { ...BASE_INPUTS, annualContribution: 100_000, horizonYears: 5, targetReturnPct: 8 },
      { pathCount: 500, seed: 42 },
    );

    expect(withContributions.drawdownRange.positiveWeakest!).toBeGreaterThanOrEqual(
      withoutContributions.drawdownRange.positiveWeakest!,
    );
    expect(withContributions.drawdownRange.negativeStrongest!).toBeGreaterThanOrEqual(
      withoutContributions.drawdownRange.negativeStrongest!,
    );
  });

  it("возвращает одинаковый результат для одинаковых входных данных и seed", () => {
    const first = runMonteCarlo(BASE_INPUTS, { pathCount: 128, seed: 42 });
    const second = runMonteCarlo(BASE_INPUTS, { pathCount: 128, seed: 42 });

    expect(second).toEqual(first);
  });
});
