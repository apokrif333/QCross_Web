export type SimulationInputs = {
  initialCapital: number;
  annualContribution: number;
  horizonYears: number;
  targetReturnPct: number;
};

export type ModelAssumptions = {
  annualReturn: number;
  annualVolatility: number;
  crisisDrawdown: number;
};

export type ScenarioPoint = {
  year: number;
  p20: number;
  p50: number;
  p80: number;
};

export type SimulationResult = {
  points: ScenarioPoint[];
  ruinProbability: number;
  assumptions: ModelAssumptions;
  crisisCount: number;
  drawdownRange: {
    positiveWeakest: number | null;
    negativeStrongest: number | null;
  };
  scenarioAnnualizedReturns: {
    positive: number;
    neutral: number;
    negative: number;
  };
};

export type SimulationPathResult = {
  yearEndBalances: number[];
  marketIndexValues?: Float64Array;
};

export type MonteCarloWorkerRequest = {
  requestId: number;
  inputs: SimulationInputs;
};

export type MonteCarloWorkerResponse =
  | {
      requestId: number;
      result: SimulationResult;
    }
  | {
      requestId: number;
      error: string;
    };
