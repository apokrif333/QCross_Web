"use client";

import { useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SimulationResult } from "@/lib/monteCarlo/types";

type MonteCarloChartProps = {
  result: SimulationResult | null;
  isCalculating: boolean;
  runtimeError: string | null;
};

const compactCurrencyFormatter = new Intl.NumberFormat("en-US", {
  currency: "USD",
  currencyDisplay: "narrowSymbol",
  maximumFractionDigits: 1,
  notation: "compact",
  style: "currency",
});

const fullCurrencyFormatter = new Intl.NumberFormat("en-US", {
  currency: "USD",
  currencyDisplay: "narrowSymbol",
  maximumFractionDigits: 0,
  style: "currency",
});

function formatCompactCurrency(value: number): string {
  return compactCurrencyFormatter.format(value);
}

function formatFullCurrency(value: number): string {
  return fullCurrencyFormatter.format(value);
}

function formatRuinProbability(probability: number): string {
  const percentage = probability * 100;
  return Number.isInteger(percentage)
    ? percentage.toFixed(0)
    : percentage.toFixed(2).replace(".", ",");
}

function formatAnnualizedReturn(value: number): string {
  return `≈ ${(value * 100).toFixed(1).replace(".", ",")}% годовых`;
}

type AxisViewBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function CenteredYAxisLabel({ viewBox }: { viewBox?: AxisViewBox }) {
  if (!viewBox) {
    return null;
  }

  const x = viewBox.x + 10;
  const y = viewBox.y + viewBox.height / 2;

  return (
    <text
      fill="#6d7f98"
      fontFamily="var(--font-sans), Arial, sans-serif"
      fontSize="9"
      textAnchor="middle"
      transform={`rotate(-90 ${x} ${y})`}
      x={x}
      y={y}
    >
      Стоимость капитала (USD)
    </text>
  );
}

export function MonteCarloChart({ result, isCalculating, runtimeError }: MonteCarloChartProps) {
  const [isLogarithmicScale, setIsLogarithmicScale] = useState(false);
  const chartData = result?.points.map((point) => ({
    ...point,
    percentileRange: [point.p20, point.p80] as [number, number],
  }));
  const horizonYears = result?.points.at(-1)?.year ?? 0;
  const yearTicks = Array.from({ length: Math.floor(horizonYears) + 1 }, (_, year) => year);
  const minimumScenarioValue = chartData
    ? Math.min(...chartData.flatMap((point) => [point.p20, point.p50, point.p80]))
    : 1;
  const logarithmicMinimum = Math.max(1, 10 ** Math.floor(Math.log10(minimumScenarioValue)));

  return (
    <div className="monte-carlo-output" aria-live="polite">
      <div className="monte-carlo-output__heading">
        <span className="monte-carlo-kicker">Гипотетические сценарии капитала</span>
        <button
          aria-label="Логарифмическая шкала"
          aria-pressed={isLogarithmicScale}
          className={`monte-carlo-log-switch${isLogarithmicScale ? " is-active" : ""}`}
          type="button"
          onClick={() => setIsLogarithmicScale((current) => !current)}
        >
          <span>Лог</span>
          <i aria-hidden="true" />
        </button>
      </div>

      {!result && (
        <div className={`monte-carlo-empty${isCalculating ? " is-loading" : ""}`}>
          {runtimeError ? (
            <p className="monte-carlo-runtime-error">{runtimeError}</p>
          ) : isCalculating ? (
            <p>Моделируем 10 000 сценариев…</p>
          ) : (
            <p>Укажите параметры и запустите расчёт сценариев.</p>
          )}
        </div>
      )}

      {result && chartData && (
        <>
          <div className="monte-carlo-chart" role="img" aria-label="График сценариев роста капитала">
            <ResponsiveContainer height="100%" width="100%">
              <ComposedChart data={chartData} margin={{ top: 18, right: 12, bottom: 24, left: 18 }}>
                <CartesianGrid stroke="rgba(198, 220, 230, 0.58)" strokeDasharray="2 5" vertical={false} />
                <XAxis
                  dataKey="year"
                  domain={[0, horizonYears]}
                  label={{
                    value: "Годы",
                    position: "insideBottom",
                    offset: -12,
                    fill: "#6d7f98",
                    fontSize: 9,
                  }}
                  stroke="#8797ad"
                  tick={{ fill: "#6d7f98", fontSize: 11 }}
                  tickLine={false}
                  ticks={yearTicks}
                  type="number"
                />
                <YAxis
                  domain={isLogarithmicScale ? [logarithmicMinimum, "auto"] : [0, "auto"]}
                  label={(props) => <CenteredYAxisLabel viewBox={props.viewBox as AxisViewBox | undefined} />}
                  scale={isLogarithmicScale ? "log" : "auto"}
                  stroke="#8797ad"
                  tick={{ fill: "#6d7f98", fontSize: 11 }}
                  tickFormatter={formatCompactCurrency}
                  tickLine={false}
                  width={62}
                />
                <Tooltip
                  contentStyle={{
                    background: "rgba(249, 252, 253, 0.97)",
                    border: "1px solid #c6dce6",
                    borderRadius: 0,
                    color: "#062e4d",
                    fontSize: 12,
                  }}
                  formatter={(value, name) => [formatFullCurrency(Number(value)), name]}
                  itemSorter={(item) => ({ p80: 0, p50: 1, p20: 2 }[String(item.dataKey)] ?? 3)}
                  labelFormatter={(year) => `Год ${year}`}
                />
                <Area
                  dataKey="percentileRange"
                  fill="#46b9d7"
                  fillOpacity={0.12}
                  isAnimationActive={false}
                  legendType="none"
                  stroke="none"
                  tooltipType="none"
                  type="linear"
                />
                <Line
                  dataKey="p80"
                  dot={false}
                  isAnimationActive={false}
                  name="Позитивный сценарий"
                  stroke="#46b9d7"
                  strokeWidth={1.35}
                  type="linear"
                />
                <Line
                  dataKey="p50"
                  dot={false}
                  isAnimationActive={false}
                  name="Нейтральный сценарий"
                  stroke="#0b4d5b"
                  strokeWidth={2.5}
                  type="linear"
                />
                <Line
                  dataKey="p20"
                  dot={false}
                  isAnimationActive={false}
                  name="Негативный сценарий"
                  stroke="#6d7f98"
                  strokeWidth={1.35}
                  type="linear"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="monte-carlo-legend" aria-label="Легенда графика">
            <span className="is-positive">
              <b>Позитивный сценарий</b>
              <small>{formatAnnualizedReturn(result.scenarioAnnualizedReturns.positive)}</small>
            </span>
            <span className="is-neutral">
              <b>Нейтральный сценарий</b>
              <small>{formatAnnualizedReturn(result.scenarioAnnualizedReturns.neutral)}</small>
            </span>
            <span className="is-negative">
              <b>Негативный сценарий</b>
              <small>{formatAnnualizedReturn(result.scenarioAnnualizedReturns.negative)}</small>
            </span>
          </div>
          <p className="monte-carlo-portfolio-note">
            Каждый рассчитанный профиль может быть реализован QCM в виде индивидуального инвестиционного портфеля.
          </p>
          <p className="monte-carlo-disclaimer">
            Расчёт носит иллюстративный характер. Результаты моделирования не являются прогнозом или гарантией будущей доходности.
          </p>

          {result.ruinProbability > 0 && (
            <p className="monte-carlo-ruin-warning" role="alert">
              {result.ruinProbability === 1
                ? "При выбранных параметрах полная потеря инвестиционного капитала происходит в 100% смоделированных сценариев."
                : `Полная потеря инвестиционного капитала произошла в ${formatRuinProbability(result.ruinProbability)}% смоделированных сценариев.`}
            </p>
          )}
        </>
      )}
    </div>
  );
}
