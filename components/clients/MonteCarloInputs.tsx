"use client";

import type { CSSProperties } from "react";
import type { SimulationInputs } from "@/lib/monteCarlo/types";
import type { SimulationResult } from "@/lib/monteCarlo/types";
import type { SimulationValidationErrors } from "@/lib/monteCarlo/validation";

export type MonteCarloFormValues = Record<keyof SimulationInputs, string>;

type MonteCarloInputsProps = {
  values: MonteCarloFormValues;
  errors: SimulationValidationErrors;
  isCalculating: boolean;
  drawdownRange: SimulationResult["drawdownRange"] | null;
  onChange: (field: keyof SimulationInputs, value: string) => void;
  onSubmit: () => void;
};

const integerFormatter = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 0,
});

function formatThousands(value: string): string {
  if (value === "") {
    return "";
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? integerFormatter.format(parsed) : value;
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
}

function formatDrawdown(value: number | null): string {
  return value === null ? "—" : `${Math.round(value * 100)}%`;
}

export function MonteCarloInputs({
  values,
  errors,
  isCalculating,
  drawdownRange,
  onChange,
  onSubmit,
}: MonteCarloInputsProps) {
  const returnProgress = `${(Number(values.targetReturnPct) - 4) / 16 * 100}%`;

  return (
    <form
      className="monte-carlo-inputs"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <span className="monte-carlo-kicker">Параметры расчёта</span>

      <label className="monte-carlo-field">
        <span>Стартовый капитал</span>
        <span className="monte-carlo-field__control">
          <input
            aria-describedby={errors.initialCapital ? "initial-capital-error" : undefined}
            aria-invalid={Boolean(errors.initialCapital)}
            disabled={isCalculating}
            inputMode="numeric"
            name="initialCapital"
            pattern="[0-9\s]*"
            type="text"
            value={formatThousands(values.initialCapital)}
            onChange={(event) => onChange("initialCapital", digitsOnly(event.target.value))}
          />
          <span>USD</span>
        </span>
        {errors.initialCapital && <small id="initial-capital-error">{errors.initialCapital}</small>}
      </label>

      <label className="monte-carlo-field">
        <span>Горизонт инвестирования</span>
        <span className="monte-carlo-field__control">
          <input
            aria-describedby={errors.horizonYears ? "horizon-years-error" : undefined}
            aria-invalid={Boolean(errors.horizonYears)}
            disabled={isCalculating}
            inputMode="numeric"
            max="60"
            min="5"
            name="horizonYears"
            step="1"
            type="number"
            value={values.horizonYears}
            onChange={(event) => onChange("horizonYears", event.target.value)}
          />
          <span>лет</span>
        </span>
        {errors.horizonYears && <small id="horizon-years-error">{errors.horizonYears}</small>}
      </label>

      <label className="monte-carlo-field">
        <span>Ежегодные пополнения</span>
        <span className="monte-carlo-field__control">
          <input
            aria-describedby={errors.annualContribution ? "annual-contribution-error" : undefined}
            aria-invalid={Boolean(errors.annualContribution)}
            disabled={isCalculating}
            inputMode="numeric"
            name="annualContribution"
            pattern="[0-9\s]*"
            type="text"
            value={formatThousands(values.annualContribution)}
            onChange={(event) => onChange("annualContribution", digitsOnly(event.target.value))}
          />
          <span>USD</span>
        </span>
        {errors.annualContribution && (
          <small id="annual-contribution-error">{errors.annualContribution}</small>
        )}
      </label>

      <label className="monte-carlo-return">
        <span className="monte-carlo-return__label">Целевая доходность</span>
        <output className="monte-carlo-return__value" htmlFor="targetReturnPct">
          {values.targetReturnPct}%
        </output>
        <input
          aria-describedby={errors.targetReturnPct ? "target-return-error" : undefined}
          aria-invalid={Boolean(errors.targetReturnPct)}
          className="monte-carlo-return__slider"
          disabled={isCalculating}
          id="targetReturnPct"
          max="20"
          min="4"
          name="targetReturnPct"
          step="1"
          style={{ "--slider-progress": returnProgress } as CSSProperties}
          type="range"
          value={values.targetReturnPct}
          onChange={(event) => onChange("targetReturnPct", event.target.value)}
        />
        <span className="monte-carlo-return__scale" aria-hidden="true">
          <span>4%</span><span>8%</span><span>12%</span><span>16%</span><span>20%</span>
        </span>
        <span className="monte-carlo-drawdown-range">
          <span>Ориентировочный диапазон просадок:</span>
          <strong>{formatDrawdown(drawdownRange?.positiveWeakest ?? null)} — {formatDrawdown(drawdownRange?.negativeStrongest ?? null)}</strong>
        </span>
        {errors.targetReturnPct && <small id="target-return-error">{errors.targetReturnPct}</small>}
      </label>

      <button className="monte-carlo-submit" disabled={isCalculating} type="submit">
        {isCalculating ? "РАССЧИТЫВАЕМ…" : "РАССЧИТАТЬ СЦЕНАРИИ"}
      </button>
    </form>
  );
}
