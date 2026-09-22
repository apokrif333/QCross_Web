import type { SimulationInputs } from "./types";

export function deriveSimulationSeed(inputs: SimulationInputs): number {
  const source = [
    inputs.initialCapital,
    inputs.annualContribution,
    inputs.horizonYears,
    inputs.targetReturnPct,
  ].join("|");

  let hash = 2166136261;

  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

export function derivePathSeed(simulationSeed: number, pathIndex: number): number {
  let value = (simulationSeed ^ Math.imul(pathIndex + 1, 0x9e3779b1)) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x85ebca6b);
  value = Math.imul(value ^ (value >>> 13), 0xc2b2ae35);
  return (value ^ (value >>> 16)) >>> 0;
}

export class SeededRandom {
  private state: number;
  private spareNormal: number | null = null;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let value = this.state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  }

  normal(): number {
    if (this.spareNormal !== null) {
      const value = this.spareNormal;
      this.spareNormal = null;
      return value;
    }

    let firstUniform = 0;

    while (firstUniform === 0) {
      firstUniform = this.next();
    }

    const secondUniform = this.next();
    const magnitude = Math.sqrt(-2 * Math.log(firstUniform));
    const angle = 2 * Math.PI * secondUniform;

    this.spareNormal = magnitude * Math.sin(angle);
    return magnitude * Math.cos(angle);
  }
}
