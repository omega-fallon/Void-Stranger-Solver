import {
  ACTIONS,
  applyAction,
  isGoal,
  renderBoard,
  stateKey,
} from "./gameState";
import { heuristic } from "./heuristic";
import type { Action, Board, GameState } from "./types";
import { actionsToString } from "./utils";
import { estimateProgress, type ProgressSample } from "./estimateProgress";

export interface SearchResult {
  path: Action[] | null;
  nodesExplored: number;
  elapsedMs: number;
}

export function countFloorTiles(board: Board): number {
  return board
    .flat()
    .reduce(
      (n, cell) => n + (["floor", "wall", "glass"].includes(cell) ? 1 : 0),
      0,
    );
}

interface DfsCounters {
  nodesExplored: number;
  loopsPrevented: number;
  pathsTrimmed: number;
}

/**
 * Shared IDA* DFS kernel used by both the main search and the progress sampler.
 *
 * Returns "found" (path still intact) on success, Infinity if unsolvable, or the
 * minimum f-cost that exceeded the threshold (next candidate threshold for IDA*).
 *
 * `onNode` is called for each node that passes the f-cost check.  Return "found"
 * to stop and preserve the path; return "continue" to recurse into children.
 */
async function idaDfs(
  state: GameState,
  g: number,
  path: Action[],
  threshold: number,
  visited: Set<string>,
  target: Board,
  hasWings: boolean,
  numFloorTilesInSolution: number,
  requireFinalJump: boolean,
  counters: DfsCounters,
  actions: Action[],
  onNode: (
    state: GameState,
    path: Action[],
    g: number,
    h: number,
  ) => Promise<"found" | "continue">,
): Promise<"found" | number> {
  const h = heuristic(state, target, requireFinalJump).total;
  const f = g + h;

  if (f > threshold) {
    counters.pathsTrimmed++;
    return f;
  }

  counters.nodesExplored++;

  const nodeDecision = await onNode(state, path, g, h);
  if (nodeDecision === "found") return "found";

  // Exit step: player is in the void but not at goal — dead end.
  // Exception: if wings are active the player is still airborne and can land.
  const { row, col } = state.player;
  if (state.board[row]?.[col] === "empty" && !state.player.wingsActive)
    return Infinity;

  // Pruning: not enough floor tiles remaining to satisfy the target.
  const floorInStaff = ["floor", "glass"].includes(state.player.staffContent)
    ? 1
    : 0;
  if (countFloorTiles(state.board) + floorInStaff < numFloorTilesInSolution)
    return Infinity;

  let min = Infinity;

  for (const action of actions) {
    const next = applyAction(state, action, hasWings);
    if (!next) continue;

    // Loop prevention speeds up searches by about 6x at threshold 20, 4x at threshold 26
    const nextKey = stateKey(next);
    if (visited.has(nextKey)) {
      counters.loopsPrevented++;
      continue;
    }
    visited.add(nextKey);

    path.push(action);

    const result = await idaDfs(
      next,
      g + 1,
      path,
      threshold,
      visited,
      target,
      hasWings,
      numFloorTilesInSolution,
      requireFinalJump,
      counters,
      actions,
      onNode,
    );

    if (result === "found") return "found"; // path is intact — don't pop

    path.pop();
    visited.delete(nextKey);

    if (result < min) min = result;
  }

  return min;
}

/**
 * Runs a single IDA* pass with a fixed threshold (default 8) and returns
 * ~`numSamples` evenly-spaced path snapshots with their true fractional
 * positions in the search tree.  Used by `estimateProgress` to produce
 * accurate progress estimates for the main search.
 */
async function sampleProgressCheckpoints(
  initial: GameState,
  target: Board,
  hasWings: boolean,
  requireFinalJump: boolean,
  actions: Action[],
  numSamples = 200,
): Promise<ProgressSample[]> {
  const numFloorTilesInSolution = countFloorTiles(target);
  const allPaths: Action[][] = [];
  const visited = new Set<string>();
  visited.add(stateKey(initial));
  const counters: DfsCounters = {
    nodesExplored: 0,
    loopsPrevented: 0,
    pathsTrimmed: 0,
  };

  await idaDfs(
    initial,
    0,
    [],
    22,
    visited,
    target,
    hasWings,
    numFloorTilesInSolution,
    requireFinalJump,
    counters,
    actions,
    async (_state, path, _g, _h) => {
      allPaths.push(path.slice());
      return "continue";
    },
  );

  const n = allPaths.length;
  if (n === 0) return [];

  const step = Math.max(1, Math.floor(n / numSamples));
  const samples: ProgressSample[] = [];
  for (let i = 0; i < n; i += step) {
    samples.push({ fraction: i / n, path: allPaths[i]! });
  }
  return samples;
}

export interface SearchOptions {
  initial: GameState;
  target: Board;
  verbose?: number;
  slow?: boolean;
  requireFinalJump?: boolean;
  initialThreshold?: number | undefined;
  knownCorrectPath?: Action[] | undefined; // DEBUG
  hasWings?: boolean;
  actions?: Action[];
}

export async function search({
  initial,
  target,
  verbose = 0,
  slow = false,
  requireFinalJump = true,
  initialThreshold,
  knownCorrectPath = [],
  hasWings = false,
  actions = ACTIONS,
}: SearchOptions): Promise<SearchResult> {
  const numFloorTilesInSolution = countFloorTiles(target);

  // Controls whether per-node progress output is shown (and whether samples
  // are collected).  Change this condition to adjust verbosity gating.
  const showProgress = verbose >= 2;

  if (showProgress && initialThreshold)
    console.log(`Searching with initial threshold ${initialThreshold}`);

  const progressSamples = showProgress
    ? await sampleProgressCheckpoints(
        initial,
        target,
        hasWings,
        requireFinalJump,
        actions,
      )
    : undefined;

  let threshold =
    initialThreshold ?? heuristic(initial, target, requireFinalJump).total;
  const counters: DfsCounters = {
    nodesExplored: 0,
    loopsPrevented: 0,
    pathsTrimmed: 0,
  };
  const start = performance.now();

  // Per-path visited set — prevents cycles within a single DFS path.
  // Memory is O(depth), never grows beyond the path length.
  const visited = new Set<string>();
  visited.add(stateKey(initial));

  while (true) {
    const path: Action[] = [];
    const result = await idaDfs(
      initial,
      0,
      path,
      threshold,
      visited,
      target,
      hasWings,
      numFloorTilesInSolution,
      requireFinalJump,
      counters,
      actions,
      async (state, path, g, h) => {
        const f = g + h;

        if (showProgress && (verbose >= 3 || Math.random() < 0.00001)) {
          const elapsedMs = performance.now() - start;
          const nodesPerSec = Math.round(
            (counters.nodesExplored / elapsedMs) * 1000,
          );
          const action = path.at(-1) ?? "start";

          const amountOfPathFound = (() => {
            for (let i = 0; i < knownCorrectPath.length; i++) {
              if (knownCorrectPath[i] != path[i]) return i;
            }
            return knownCorrectPath.length;
          })();

          console.log(
            `Threshold: ${threshold} | Explored: ${counters.nodesExplored} | ${counters.loopsPrevented} loops prevented | ${counters.pathsTrimmed} paths trimmed | ` +
              `${(elapsedMs / 1000).toFixed(0)}s | ${nodesPerSec} nodes/sec\n` +
              `Path: ${g} | f=${f} (${g}g+${h}h) | ${amountOfPathFound} correct: ${actionsToString(
                path,
              )}\n` +
              `${knownCorrectPath.length} | ${(
                estimateProgress(path, progressSamples) * 100
              ).toFixed(9)}% through search space (solution is ${(
                estimateProgress(knownCorrectPath, progressSamples) * 100
              ).toFixed(9)}%) | Action: ${action}\n` +
              `${renderBoard(state, numFloorTilesInSolution)}`,
          );
        }

        if (slow)
          await new Promise<void>((resolve) => setTimeout(resolve, 100));

        if (isGoal(state, target, requireFinalJump)) return "found";
        return "continue";
      },
    );

    const elapsedMs = performance.now() - start;
    if (verbose) {
      console.log(
        `--- Threshold ${threshold}, result: ${result} | ${
          counters.nodesExplored
        } nodes so far | ${elapsedMs.toFixed(0)}ms | ${(
          counters.nodesExplored /
          (elapsedMs / 1000)
        ).toFixed(0)} nodes/sec ---`,
      );
    }

    if (result === "found")
      return { path, nodesExplored: counters.nodesExplored, elapsedMs };
    if (result === Infinity)
      return { path: null, nodesExplored: counters.nodesExplored, elapsedMs };

    threshold = result;
  }
}
