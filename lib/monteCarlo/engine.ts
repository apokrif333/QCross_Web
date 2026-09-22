import { getModelAssumptions } from "./assumptions";
import { detectDrawdownEpisodes, type CrisisEpisode } from "./crisis";
import { percentile } from "./percentiles";
import { derivePathSeed, deriveSimulationSeed, SeededRandom } from "./random";
import type {
  ModelAssumptions,
  SimulationInputs,
  SimulationPathResult,
  SimulationResult,
} from "./types";

export const SIMULATION_PATHS = 10_000;

type SimulationOptions = {
  pathCount?: number;
  seed?: number;
};

type PathSimulationOptions = {
  trackMarketIndex?: boolean;
};

type ScenarioCohort = "p20" | "p50" | "p80";

export type RepresentativeCrisis = {
  drawdown: number;
  durationMonths: number;
  crisisYear: number;
};

export function simulatePath(
  inputs: SimulationInputs,
  assumptions: ModelAssumptions,
  standardNormal: () => number,
  options: PathSimulationOptions = {},
): SimulationPathResult {
  const monthlyLogDrift = Math.log1p(assumptions.annualReturn) / 12;
  const monthlyVolatility = assumptions.annualVolatility / Math.sqrt(12);
  const totalMonths = inputs.horizonYears * 12;
  const yearEndBalances = new Array<number>(inputs.horizonYears + 1);
  const marketIndexValues = options.trackMarketIndex ? new Float64Array(totalMonths + 1) : undefined;

  let balance = inputs.initialCapital;
  let marketIndex = 1;
  let monthIndex = 0;

  yearEndBalances[0] = balance;
  if (marketIndexValues) {
    marketIndexValues[0] = marketIndex;
  }

  for (let year = 1; year <= inputs.horizonYears; year += 1) {
    for (let month = 0; month < 12; month += 1) {
      const logReturn = monthlyLogDrift + monthlyVolatility * standardNormal();
      const grossReturn = Math.exp(logReturn);
      balance = Math.max(0, balance * grossReturn);
      marketIndex *= grossReturn;
      monthIndex += 1;

      if (marketIndexValues) {
        marketIndexValues[monthIndex] = marketIndex;
      }
    }

    // Contributions are invested only after each completed year of returns.
    balance += inputs.annualContribution;
    yearEndBalances[year] = balance;
  }

  return { yearEndBalances, marketIndexValues };
}

/**
 * Creates a deterministic annual path from observed crisis characteristics.
 * On a crisis year the point is exactly the preceding year-end balance times
 * the measured crisis multiplier, then the annual contribution is added.
 * Normal-year growth is calibrated to retain the terminal Monte Carlo
 * percentile, and the final three years contain no crisis points.
 */
export function buildRepresentativeScenario(
  inputs: SimulationInputs,
  targetTerminalBalance: number,
  crises: readonly RepresentativeCrisis[],
): number[] {
  const crisesByYear = new Map(crises.map((crisis) => [crisis.crisisYear, crisis]));

  const simulateWithDrift = (monthlyLogDrift: number): number[] => {
    const balances = new Array<number>(inputs.horizonYears + 1);
    let balance = inputs.initialCapital;
    balances[0] = balance;

    for (let year = 1; year <= inputs.horizonYears; year += 1) {
      const crisis = crisesByYear.get(year);
      balance *= crisis ? 1 + crisis.drawdown : Math.exp(monthlyLogDrift * 12);
      balance += inputs.annualContribution;
      balances[year] = balance;
    }

    return balances;
  };

  let low = -0.25;
  let high = 0.25;

  for (let iteration = 0; iteration < 90; iteration += 1) {
    const middle = (low + high) / 2;
    const terminalBalance = simulateWithDrift(middle).at(-1) ?? 0;

    if (terminalBalance < targetTerminalBalance) {
      low = middle;
    } else {
      high = middle;
    }
  }

  return simulateWithDrift((low + high) / 2);
}

export function runMonteCarlo(
  inputs: SimulationInputs,
  options: SimulationOptions = {},
): SimulationResult {
  const assumptions = getModelAssumptions(inputs.targetReturnPct);
  const pathCount = options.pathCount ?? SIMULATION_PATHS;
  const seed = options.seed ?? deriveSimulationSeed(inputs);
  const balancesByYear = Array.from(
    { length: inputs.horizonYears + 1 },
    () => new Float64Array(pathCount),
  );
  const terminalBalances = new Float64Array(pathCount);
  const episodesByPath = new Array<CrisisEpisode[]>(pathCount);

  for (let pathIndex = 0; pathIndex < pathCount; pathIndex += 1) {
    const path = simulatePath(
      inputs,
      assumptions,
      createPathNormalGenerator(seed, pathIndex),
      { trackMarketIndex: true },
    );

    terminalBalances[pathIndex] = path.yearEndBalances.at(-1) ?? 0;
    episodesByPath[pathIndex] = detectDrawdownEpisodes(path.marketIndexValues!);

    for (let year = 0; year <= inputs.horizonYears; year += 1) {
      balancesByYear[year][pathIndex] = path.yearEndBalances[year];
    }
  }

  const terminalCohorts = createTerminalCohorts(terminalBalances);
  const crisisCount = Math.floor(inputs.horizonYears / 5);
  const crisesByScenario = {
    p20: buildCrisesForCohort("p20"),
    p50: buildCrisesForCohort("p50"),
    p80: buildCrisesForCohort("p80"),
  };
  const scenarioPaths = {
    p20: buildScenario("p20", 0.2),
    p50: buildScenario("p50", 0.5),
    p80: buildScenario("p80", 0.8),
  };

  return {
    points: Array.from({ length: inputs.horizonYears + 1 }, (_, year) => ({
      year,
      p20: scenarioPaths.p20[year],
      p50: scenarioPaths.p50[year],
      p80: scenarioPaths.p80[year],
    })),
    ruinProbability: 0,
    assumptions,
    crisisCount,
    drawdownRange: {
      positiveWeakest: weakestObservedDrawdown(scenarioPaths.p80, crisesByScenario.p80),
      negativeStrongest: strongestObservedDrawdown(scenarioPaths.p20, crisesByScenario.p20),
    },
    scenarioAnnualizedReturns: {
      positive: calculateAnnualizedReturn(inputs, scenarioPaths.p80.at(-1) ?? 0),
      neutral: calculateAnnualizedReturn(inputs, scenarioPaths.p50.at(-1) ?? 0),
      negative: calculateAnnualizedReturn(inputs, scenarioPaths.p20.at(-1) ?? 0),
    },
  };

  function buildCrisesForCohort(cohort: ScenarioCohort): RepresentativeCrisis[] {
    const selectedEpisodes = cohort === "p50"
      ? episodesByPath
      : episodesByPath.filter((_, index) => terminalCohorts[index] === cohort);
    return buildRepresentativeCrises(selectedEpisodes, crisisCount, inputs.horizonYears);
  }

  function buildScenario(
    cohort: ScenarioCohort,
    quantile: number,
  ): number[] {
    const terminalTarget = percentile(terminalBalances, quantile);
    return buildRepresentativeScenario(inputs, terminalTarget, crisesByScenario[cohort]);
  }
}

function weakestObservedDrawdown(
  balances: readonly number[],
  crises: readonly RepresentativeCrisis[],
): number | null {
  const drawdowns = observedCrisisDrawdowns(balances, crises);
  return drawdowns.length === 0 ? null : Math.max(...drawdowns);
}

function strongestObservedDrawdown(
  balances: readonly number[],
  crises: readonly RepresentativeCrisis[],
): number | null {
  const drawdowns = observedCrisisDrawdowns(balances, crises);
  return drawdowns.length === 0 ? null : Math.min(...drawdowns);
}

function observedCrisisDrawdowns(
  balances: readonly number[],
  crises: readonly RepresentativeCrisis[],
): number[] {
  return crises.map((crisis) => {
    const balanceBeforeCrisis = balances[crisis.crisisYear - 1];
    const balanceAfterContribution = balances[crisis.crisisYear];

    if (balanceBeforeCrisis <= 0) {
      return 0;
    }

    return Math.min(0, balanceAfterContribution / balanceBeforeCrisis - 1);
  });
}

function calculateAnnualizedReturn(inputs: SimulationInputs, terminalBalance: number): number {
  const projectTerminalBalance = (annualReturn: number): number => {
    const growthFactor = (1 + annualReturn) ** inputs.horizonYears;
    const contributions = annualReturn === 0
      ? inputs.annualContribution * inputs.horizonYears
      : inputs.annualContribution * (growthFactor - 1) / annualReturn;
    return inputs.initialCapital * growthFactor + contributions;
  };

  let low = -0.99;
  let high = 1;

  while (projectTerminalBalance(high) < terminalBalance && high < 100) {
    high *= 2;
  }

  for (let iteration = 0; iteration < 80; iteration += 1) {
    const middle = (low + high) / 2;
    if (projectTerminalBalance(middle) < terminalBalance) {
      low = middle;
    } else {
      high = middle;
    }
  }

  return (low + high) / 2;
}

function buildRepresentativeCrises(
  episodesByPath: readonly CrisisEpisode[][],
  crisisCount: number,
  horizonYears: number,
): RepresentativeCrisis[] {
  return Array.from({ length: crisisCount }, (_, rank) => {
    const episodesAtRank = episodesByPath
      .map((episodes) => episodes[rank])
      .filter((episode): episode is CrisisEpisode => episode !== undefined);

    if (episodesAtRank.length === 0) {
      return null;
    }

    const drawdown = percentile(
      episodesAtRank.map((episode) => episode.maximumDrawdown),
      0.5,
    );
    const measuredDurationMonths = Math.max(1, Math.round(percentile(
      episodesAtRank.map((episode) => episode.timeToTroughMonths),
      0.5,
    )));
    const preRecoveryYears = Math.max(1, horizonYears - 3);
    const crisisYear = Math.round(preRecoveryYears * (rank + 1) / crisisCount);

    return { drawdown, durationMonths: measuredDurationMonths, crisisYear };
  }).filter((crisis): crisis is RepresentativeCrisis => crisis !== null);
}

function createPathNormalGenerator(simulationSeed: number, pathIndex: number): () => number {
  const random = new SeededRandom(derivePathSeed(simulationSeed, pathIndex));
  return () => random.normal();
}

function createTerminalCohorts(terminalBalances: Float64Array): Array<ScenarioCohort | null> {
  const orderedIndices = Array.from(terminalBalances, (_, index) => index)
    .sort((left, right) => terminalBalances[left] - terminalBalances[right]);
  const cohortSize = Math.max(1, Math.floor(terminalBalances.length * 0.2));
  const middleStart = Math.floor((terminalBalances.length - cohortSize) / 2);
  const cohorts: Array<ScenarioCohort | null> = Array.from({ length: terminalBalances.length }, () => null);

  for (let rank = 0; rank < cohortSize; rank += 1) {
    cohorts[orderedIndices[rank]] = "p20";
    cohorts[orderedIndices[orderedIndices.length - 1 - rank]] = "p80";
  }

  for (let rank = middleStart; rank < middleStart + cohortSize; rank += 1) {
    cohorts[orderedIndices[rank]] = "p50";
  }

  return cohorts;
}
