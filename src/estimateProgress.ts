import { ACTIONS } from "./gameState";
import type { Action } from "./types";

export type ProgressSample = { fraction: number; path: Action[] };

/** Returns the position of path `a` relative to `b` in DFS visit order.
 *  Negative → a comes before b, 0 → equal, positive → a comes after b.
 *  Shorter paths (parents) come before their descendants. */
function pathCompareDFS(a: Action[], b: Action[]): number {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    const diff = ACTIONS.indexOf(a[i]!) - ACTIONS.indexOf(b[i]!);
    if (diff !== 0) return diff;
  }
  return a.length - b.length;
}

/** Uniform-tree estimate used both as the fallback and as the fine-grained
 *  interpolator within a sample interval. */
function estimateProgressUniform(path: Action[]): number {
  let progress = 0;
  for (let i = 0; i < path.length; i++) {
    const stepValue = ACTIONS.indexOf(path[i]!) / ACTIONS.length;
    progress += stepValue * Math.pow(1 / ACTIONS.length, i);
  }
  return progress;
}

/**
 * Estimates how far through the search space a given path is (range [0, 1)).
 *
 * Without `samples` the estimate uses a uniform base-5 tree model.
 * With `samples` (produced by `sampleProgressCheckpoints`) the estimate is
 * anchored to real DFS checkpoints and only uses the uniform model for
 * fine-grained interpolation between neighbouring samples.
 */
export function estimateProgress(
  path: Action[],
  samples?: ProgressSample[],
): number {
  if (!samples || samples.length === 0) {
    return estimateProgressUniform(path);
  }

  // Binary search: find the largest index whose path ≤ `path` in DFS order.
  let lo = 0;
  let hi = samples.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (pathCompareDFS(samples[mid]!.path, path) <= 0) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }

  const loSample = samples[lo]!;
  const hiSample = samples[lo + 1];

  // Past the last sample — return its fraction.
  if (!hiSample) return loSample.fraction;

  // Interpolate within [lo, hi] using the uniform formula.
  const tLo = estimateProgressUniform(loSample.path);
  const tHi = estimateProgressUniform(hiSample.path);
  const tQuery = estimateProgressUniform(path);

  if (tHi === tLo) return loSample.fraction;

  const t = Math.max(0, Math.min(1, (tQuery - tLo) / (tHi - tLo)));
  return loSample.fraction + t * (hiSample.fraction - loSample.fraction);
}
