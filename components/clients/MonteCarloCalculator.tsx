"use client";

import { useEffect, useRef, useState } from "react";
import {
  MonteCarloInputs,
  type MonteCarloFormValues,
} from "@/components/clients/MonteCarloInputs";
import { MonteCarloChart } from "@/components/clients/MonteCarloChart";
import type {
  MonteCarloWorkerResponse,
  SimulationInputs,
  SimulationResult,
} from "@/lib/monteCarlo/types";
import {
  validateSimulationInputs,
  type SimulationValidationErrors,
} from "@/lib/monteCarlo/validation";

const INITIAL_VALUES: MonteCarloFormValues = {
  initialCapital: "1000000",
  annualContribution: "100000",
  horizonYears: "20",
  targetReturnPct: "8",
};

function parseFormValues(values: MonteCarloFormValues): SimulationInputs {
  const parseRequiredNumber = (value: string) => value.trim() === "" ? Number.NaN : Number(value);

  return {
    initialCapital: parseRequiredNumber(values.initialCapital),
    annualContribution: parseRequiredNumber(values.annualContribution),
    horizonYears: parseRequiredNumber(values.horizonYears),
    targetReturnPct: parseRequiredNumber(values.targetReturnPct),
  };
}

export function MonteCarloCalculator() {
  const [values, setValues] = useState(INITIAL_VALUES);
  const [errors, setErrors] = useState<SimulationValidationErrors>({});
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const worker = new Worker(new URL("../../workers/monteCarlo.worker.ts", import.meta.url));
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<MonteCarloWorkerResponse>) => {
      if (event.data.requestId !== requestIdRef.current) {
        return;
      }

      setIsCalculating(false);

      if ("error" in event.data) {
        setRuntimeError(event.data.error);
        setResult(null);
        return;
      }

      setRuntimeError(null);
      setResult(event.data.result);
    };

    worker.onerror = () => {
      setIsCalculating(false);
      setResult(null);
      setRuntimeError("Не удалось запустить модель. Обновите страницу и повторите расчёт.");
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  function handleChange(field: keyof SimulationInputs, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setResult(null);
    setRuntimeError(null);
  }

  function handleSubmit() {
    const inputs = parseFormValues(values);
    const nextErrors = validateSimulationInputs(inputs);

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    if (!workerRef.current) {
      setRuntimeError("Модель ещё загружается. Повторите расчёт через несколько секунд.");
      return;
    }

    requestIdRef.current += 1;
    setResult(null);
    setRuntimeError(null);
    setIsCalculating(true);
    workerRef.current.postMessage({ requestId: requestIdRef.current, inputs });
  }

  return (
    <div className="monte-carlo-calculator">
      <MonteCarloInputs
        drawdownRange={result?.drawdownRange ?? null}
        errors={errors}
        isCalculating={isCalculating}
        values={values}
        onChange={handleChange}
        onSubmit={handleSubmit}
      />
      <MonteCarloChart
        isCalculating={isCalculating}
        result={result}
        runtimeError={runtimeError}
      />
    </div>
  );
}
