import { runMonteCarlo } from "@/lib/monteCarlo/engine";
import type {
  MonteCarloWorkerRequest,
  MonteCarloWorkerResponse,
} from "@/lib/monteCarlo/types";

type WorkerContext = {
  onmessage: ((event: MessageEvent<MonteCarloWorkerRequest>) => void) | null;
  postMessage: (message: MonteCarloWorkerResponse) => void;
};

const workerContext = self as unknown as WorkerContext;

workerContext.onmessage = (event) => {
  const { requestId, inputs } = event.data;

  try {
    workerContext.postMessage({ requestId, result: runMonteCarlo(inputs) });
  } catch (error) {
    workerContext.postMessage({
      requestId,
      error: error instanceof Error ? error.message : "Не удалось выполнить расчёт.",
    });
  }
};

export {};
