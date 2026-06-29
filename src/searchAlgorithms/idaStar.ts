import { estimateProgress, type ProgressSample } from "../estimateProgress";
import {
  ACTIONS,
  applyAction,
  isGoal,
  renderState,
  replayPath,
  stateKey,
  inBounds,
  facedTile,
  stairsActive,
} from "../gameState";
import { heuristic } from "../heuristic";
import type {
  Action,
  Board,
  Burdens,
  GameState,
  Entity,
  EntityGrid,
} from "../types";
import { NO_BURDENS, Direction } from "../types";
import { actionsToString } from "../utils";
import {
  countFloorTiles,
  isPruned,
  floorInStaff,
  readBoardCouplet,
  readEntityCouplet,
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
  braneName: string,
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
  const h = heuristic(braneName, state, target, requireFinalJump, burdens).total;
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
          JSON.stringify(heuristic(braneName, state, target, requireFinalJump, burdens)) +
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
    // Isolated here so it can be used twice.
    function staffTrims(state: GameState) {
      return (
        // EVR and stairs aren't sealed.
        burdens.endless && stairsActive(state.player.staffContent, state.board, state.entities) &&
        // No need to ever place the stairs if we have the EVR. (Exception made if we have more tiles behind the stairs in the queue.)
        ((action === "staff" &&
          state.player.staffContent.length === 1 &&
          state.player.staffContent[0] === "stairs" &&
          readBoardCouplet(state.board, facedTile(state.player)) === "empty") ||
          // Obvious optimization that mostly only matters for Cif brane. Always take the stairs if we're empty-handed and have EVR.
          (actions.includes("staff") &&
            action !== "staff" &&
            state.player.staffContent.length === 0 &&
            readBoardCouplet(state.board, facedTile(state.player)) === "stairs"))
      );
    }

    if (staffTrims(state)) {
      continue;
    }

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

    // BIG LONG FUNCTIONALLY EQUIVALENT PATHS OPTIMIZATION... STARTO!
    // Look at each direction we could face. If there is no 'Z' action available for any given direction, the state is equivalent to any other facing direction for which that is true.
    const directions: [Direction, Direction, Direction, Direction] = [
      "up",
      "right",
      "down",
      "left",
    ];

    const directionCoords: [
      [number, number],
      [number, number],
      [number, number],
      [number, number],
    ] = [
      [next.player.row - 1, next.player.col],
      [next.player.row, next.player.col + 1],
      [next.player.row + 1, next.player.col],
      [next.player.row, next.player.col - 1],
    ];

    function isZInvalid(direction_i: number): boolean {
      // Speed up: don't duplicate if not needed.
      if (next!.player.facing === directions[direction_i]!) {
        if (staffTrims(next!)) {
          return true;
        }

        return applyAction(next!, "staff", burdens) === null;
      }
      // Alter facing direction
      else {
        let nextModifiedFacing = structuredClone(next!);
        nextModifiedFacing.player.facing! = directions[direction_i]!;

        if (staffTrims(nextModifiedFacing)) {
          return true;
        }

        return applyAction(nextModifiedFacing, "staff", burdens) === null;
      }
    }

    // Iterate through directions
    for (let i = 0; i < 4; i++) {
      let facedFound = false;

      // Is player facing this direction...
      if (next.player.facing === directions[i]) {
        // Mark this as true so once we're done with the second loop, we exit the first one for efficiency.
        facedFound = true;
        //...and is it marked as Z invalid?
        if (isZInvalid(i)) {
          // Iterate through the directions again.
          for (let i2 = 0; i2 < 4; i2++) {
            // Skip the one we're already facing.
            if (i === i2) {
              continue;
            }

            // If this direction is Z invalid, increase the counter and log it as visited, since it is equivalent to the direction the player is facing.
            if (isZInvalid(i2)) {
              counters.nullEquivalencesLogged++;
              visited.add(
                nextKey.replace(
                  "," + String(directions[i]) + ",",
                  "," + String(directions[i2]) + ",",
                ),
              );
            }
          }
        }
      }

      // Having found the faced direction, exit the loop.
      if (facedFound) {
        break;
      }
    }
    // EQUIVALENT PATHS TRIMS DONE!

    path.push(action);

    const result = await idaDfs(
      braneName,
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
  braneName: string,
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
    nullEquivalencesLogged: 0,
  };

  await idaDfs(
    braneName,
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
  braneName,
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
        braneName,
        initial,
        target,
        burdens,
        requireFinalJump,
        actions,
      )
    : undefined;

  let threshold =
    initialThreshold ??
    heuristic(braneName, initial, target, requireFinalJump, burdens).total;
  const counters: DfsCounters = {
    nodesExplored: 0,
    loopsPrevented: 0,
    pathsTrimmed: 0,
    nullEquivalencesLogged: 0,
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
      braneName,
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
            `Threshold: ${threshold} | Explored: ${counters.nodesExplored} | ${counters.loopsPrevented} loops prevented | ${counters.pathsTrimmed} paths trimmed | ${counters.nullEquivalencesLogged} null equivalences logged\n` +
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
      return { path, nodesExplored: counters.nodesExplored, elapsedMs };
    } else if (result === Infinity) {
      return { path: null, nodesExplored: counters.nodesExplored, elapsedMs };
    }

    threshold = result;
  }
}
