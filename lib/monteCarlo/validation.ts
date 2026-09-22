import type { SimulationInputs } from "./types";

export type SimulationValidationErrors = Partial<Record<keyof SimulationInputs, string>>;

export function validateSimulationInputs(inputs: SimulationInputs): SimulationValidationErrors {
  const errors: SimulationValidationErrors = {};

  if (!Number.isFinite(inputs.initialCapital)) {
    errors.initialCapital = "Укажите стартовый капитал.";
  } else if (inputs.initialCapital < 50_000 || inputs.initialCapital > 100_000_000) {
    errors.initialCapital = "Допустимо от 50 000 до 100 000 000 USD.";
  }

  if (!Number.isFinite(inputs.annualContribution)) {
    errors.annualContribution = "Укажите размер ежегодных пополнений.";
  } else if (inputs.annualContribution < 0 || inputs.annualContribution > 1_000_000) {
    errors.annualContribution = "Допустимо от 0 до 1 000 000 USD.";
  }

  if (!Number.isInteger(inputs.horizonYears)) {
    errors.horizonYears = "Укажите целое количество лет.";
  } else if (inputs.horizonYears < 5 || inputs.horizonYears > 60) {
    errors.horizonYears = "Допустимый горизонт — от 5 до 60 лет.";
  }

  if (!Number.isInteger(inputs.targetReturnPct)) {
    errors.targetReturnPct = "Доходность должна быть указана целым процентом.";
  } else if (inputs.targetReturnPct < 4 || inputs.targetReturnPct > 20) {
    errors.targetReturnPct = "Допустимая доходность — от 4% до 20%.";
  }

  return errors;
}
