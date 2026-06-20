import { estimateProgress, type ProgressSample } from "../estimateProgress";
import {
  ACTIONS,
  applyAction,
  isGoal,
  renderState,
  replayPath,
  stateKey,
} from "../gameState";
import { heuristic } from "../heuristic";
import type { Action, Board, Burdens, GameState } from "../types";
import { NO_BURDENS } from "../types";
import { actionsToString } from "../utils";
import {
  countFloorTiles,
  isPruned,
  floorInStaff,
  type DfsCounters,
  type SearchOptions,
  type SearchResult,
} from "./shared";

const verbose = Number(process.env.VERBOSE);

/**
 * Shared IDA* DFS kernel used by both the main search and the progress sampler.
 *
 * Returns "found" (path still intact) on success, Infinity if unsolvable, or the
 * minimum f-cost that exceeded the threshold (next candidate threshold for IDA*).
 *
 * `onNode` is called for each node that passes the f-cost check.  Return "found"
 * to stop and preserve the path; return "continue" to recurse into children.
 */
export async function idaDfs(
  initial: GameState,
  state: GameState,
  g: number,
  path: Action[],
  threshold: number,
  visited: Set<string>,
  target: Board,
  burdens: Burdens,
  numFloorTilesInSolution: number,
  requireFinalJump: boolean,
  counters: DfsCounters,
  actions: Action[],
  knownCorrectPath: Action[],
  onNode: (
    state: GameState,
    path: Action[],
    g: number,
    h: number,
  ) => Promise<"found" | "continue">,
): Promise<"found" | number> {
  const h = heuristic(state, target, requireFinalJump, burdens).total;
  const f = g + h;

  if (f > threshold) {
    const amountOfPathFound = (() => {
      for (let i = 0; i < knownCorrectPath.length; i++) {
        if (knownCorrectPath[i] != path[i]) return i;
      }
      return knownCorrectPath.length;
    })();
    if (
      amountOfPathFound === path.length &&
      threshold >= knownCorrectPath.length
    )
      console.warn(
        `Pruning state from correct path (above threshold): ${g} + ${h} > ${threshold}\n` +
          `${actionsToString(path)} / ${actionsToString(knownCorrectPath)}\n` +
          JSON.stringify(heuristic(state, target, requireFinalJump, burdens)) +
          "\n" +
          renderState(state),
      );
    counters.pathsTrimmed++;
    return f;
  }

  counters.nodesExplored++;

  // Take an async break for unit tests to be able to cancel the run
  if (counters.nodesExplored % 500 === 0)
    await new Promise<void>((resolve) => setImmediate(resolve));

  // Note: checking for goal before pruning means dying to a watcher while
  // flying and landing in the solution IS accounted for.
  const nodeDecision = await onNode(state, path, g, h);
  if (nodeDecision === "found") return "found";

  // Processing prunings.
  let pruneReason = isPruned(
    state,
    target,
    burdens,
    numFloorTilesInSolution,
    initial,
  );
  if (pruneReason) {
    //console.log(pruneReason);
    const amountOfPathFound = (() => {
      for (let i = 0; i < knownCorrectPath.length; i++) {
        if (knownCorrectPath[i] != path[i]) return i;
      }
      return knownCorrectPath.length;
    })();
    if (amountOfPathFound === path.length) {
      console.warn(
        `Pruning state from correct path (invalid): ${pruneReason}\npath length: ${path.length}\n` +
          renderState(state),
      );
      replayPath(state, path, target, burdens, false);
    }
    return Infinity;
  }

  let min = Infinity;

  for (const action of actions) {
    const next = applyAction(state, action, burdens);
    if (!next) continue;

    // TEST TEST REMOVE
    //if ([...visited].length >= 5) {
    //  console.log(visited);
    //}

    // Loop prevention speeds up searches by about 6x at threshold 20, 4x at threshold 26
    const nextKey = stateKey(next);
    if (visited.has(nextKey)) {
      counters.loopsPrevented++;
      continue;
    }
    visited.add(nextKey);

    path.push(action);

    const result = await idaDfs(
      initial,
      next,
      g + 1,
      path,
      threshold,
      visited,
      target,
      burdens,
      numFloorTilesInSolution,
      requireFinalJump,
      counters,
      actions,
      knownCorrectPath,
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
 * Runs a single IDA* pass with a fixed threshold (default 22) and returns
 * ~`numSamples` evenly-spaced path snapshots with their true fractional
 * positions in the search tree.  Used by `estimateProgress` to produce
 * accurate progress estimates for the main search.
 */
async function sampleProgressCheckpoints(
  initial: GameState,
  target: Board,
  burdens: Burdens,
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
    initial,
    0,
    [],
    8, // TODO: Skip this entirely when knownCorrectPath is some tiny number (as seen in unit tests)
    visited,
    target,
    burdens,
    numFloorTilesInSolution,
    requireFinalJump,
    counters,
    actions,
    [],
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

export async function idaStar({
  initial,
  target,
  verbose = 0, // TODO: Clean up whether I pass this as variable vs use env variable everywhere
  slow = false,
  requireFinalJump = true,
  initialThreshold,
  knownCorrectPath = [],
  burdens = NO_BURDENS,
  actions = ACTIONS,
}: SearchOptions): Promise<SearchResult> {
  const numFloorTilesInSolution = countFloorTiles(target);

  // Controls whether per-node progress output is shown (and whether samples
  // are collected).  Change this condition to adjust verbosity gating.
  const showProgress = verbose >= 2;

  if (showProgress && initialThreshold)
    console.log(`Searching with initial threshold ${initialThreshold}`);

  const progressSamples =
    showProgress ?
      await sampleProgressCheckpoints(
        initial,
        target,
        burdens,
        requireFinalJump,
        actions,
      )
    : undefined;

  let threshold =
    initialThreshold ??
    heuristic(initial, target, requireFinalJump, burdens).total;
  const counters: DfsCounters = {
    nodesExplored: 0,
    loopsPrevented: 0,
    pathsTrimmed: 0,
  };
  const start = performance.now();
  // Initialized to 0 so the first log fires immediately rather than waiting 3s.
  let lastLogTime = 0;

  // Per-path visited set — prevents cycles within a single DFS path.
  // Memory is O(depth), never grows beyond the path length.
  const visited = new Set<string>();
  visited.add(stateKey(initial));

  while (true) {
    const path: Action[] = [];

    // Runs idaDfs and returns the result.
    const result = await idaDfs(
      initial,
      initial,
      0,
      path,
      threshold,
      visited,
      target,
      burdens,
      numFloorTilesInSolution,
      requireFinalJump,
      counters,
      actions,
      knownCorrectPath,

      // Feeds the result of this async function into idaDfs's onNode parameter.
      async (state, path, g, h) => {
        const f = g + h;

        const now = performance.now();
        if (showProgress && (verbose >= 3 || now - lastLogTime >= 3000)) {
          lastLogTime = now;
          const elapsedMs = now - start;
          const nodesPerSec = Math.round(
            (counters.nodesExplored / elapsedMs) * 1000,
          );
          const action = path.at(-1) ?? "start";

          const amountOfPathFound = (() => {
            for (let i = 0; i < knownCorrectPath.length; i++) {
              if (knownCorrectPath[i] != path[i]) return i;
            }

            if (!knownCorrectPath) {
              throw new Error("Unknown knownCorrectPath.");
            }

            return knownCorrectPath.length;
          })();

          console.log(
            `Threshold: ${threshold} | Explored: ${counters.nodesExplored} | ${counters.loopsPrevented} loops prevented | ${counters.pathsTrimmed} paths trimmed | ` +
              `${(elapsedMs / 1000).toFixed(0)}s | ${nodesPerSec} nodes/sec\n` +
              `Path: ${g} | f=${f} (${g}g+${h}h) | ${amountOfPathFound} correct: ${actionsToString(
                path,
              )} / ${actionsToString(knownCorrectPath)}\n` +
              `${knownCorrectPath.length} | ${(
                estimateProgress(path, progressSamples) * 100
              ).toFixed(9)}% through search space (solution is ${(
                estimateProgress(knownCorrectPath, progressSamples) * 100
              ).toFixed(9)}%) | Action: ${action}\n` +
              `${renderState(state, numFloorTilesInSolution)}`,
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

    if (result === "found") {
      if (path === null) {
        console.log("uh oh null path");
      } else if (path.length === 0) {
        console.log("uh oh empty path");
      }
      else {
        console.log("proper found:",path);
      }
      return { path, nodesExplored: counters.nodesExplored, elapsedMs };
    }
    else if (result === Infinity) {
      console.log("uh oh infinite result, null path");
      return { path: null, nodesExplored: counters.nodesExplored, elapsedMs };
    }
    else {
      console.log("default case");
    }

    threshold = result;
  }
}
