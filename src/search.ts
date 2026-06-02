import { ProgressSample, estimateProgress } from "./estimateProgress";
import {
  ACTIONS,
  applyAction,
  isGoal,
  renderBoard,
  stateKey,
} from "./gameState";
import { heuristic } from "./heuristic";
import type { Action, Board, EntityGrid, GameState } from "./types";
import { actionsToString } from "./utils";

export interface SearchResult {
  path: Action[] | null;
  nodesExplored: number;
  elapsedMs: number;
}

export function countFloorTiles(board: Board): number {
  return board
    .flat()
    .reduce(
      (n, cell) =>
        n +
        ((
          [
            "floor",
            "wall",
            "glass",
            "button",
            "trap_inactive",
            "trap_active",
          ].includes(cell)
        ) ?
          1
        : 0),
      0,
    );
}

// Returns true if all watchers are triggered.
export function allWatchersTriggeredQuestion(entities: EntityGrid): boolean {
  let found_any: boolean = false;
  for (let i = 0; i < 6; i++) {
    for (let i2 = 0; i2 < 6; i2++) {
      if (entities[i]![i2]! === "watcher_inactive") {
        return false;
      } else if (!found_any && entities[i]![i2]! === "watcher_active") {
        found_any = true;
      }
    }
  }

  return found_any;
}

// Returns true if all but one watchers are triggered.
export function staffBanned(entities: EntityGrid): boolean {
  let found_inactive: boolean = false;
  let found_active: boolean = false;
  for (let i = 0; i < 6; i++) {
    for (let i2 = 0; i2 < 6; i2++) {
      if (entities[i]![i2]! === "watcher_inactive") {
        if (!found_inactive) {
          found_inactive = true;
        }
        // Second inactive found, we're safe.
        else {
          return false;
        }
      } else if (!found_active && entities[i]![i2]! === "watcher_active") {
        found_active = true;
      }
    }
  }

  return found_active;
}

// Simply counts inactive watchers.
export function countInactiveWatchers(entities: EntityGrid): number {
  let counter = 0;
  for (let i = 0; i < 6; i++) {
    for (let i2 = 0; i2 < 6; i2++) {
      if (entities[i]![i2]! === "watcher_inactive") {
        counter++;
      }
    }
  }
  return counter;
}

// Counts how many places there are where the current state has a hole but the target wants a tile.
export function countDeficits(board: Board, target: Board): number {
  let counter = 0;
  for (let i = 0; i < 6; i++) {
    for (let i2 = 0; i2 < 6; i2++) {
      if (board[i]![i2]! === "empty" && target[i]![i2]! !== "empty") {
        counter++;
      }
    }
  }
  return counter;
}

// Returns true if a beaver or mimic are present in the brane.
export function hereBeMovers(entities: EntityGrid): boolean {
  for (let i = 0; i < 6; i++) {
    for (let i2 = 0; i2 < 6; i2++) {
      if (entities[i]![i2]! === "mimic" || entities[i]![i2]! === "beaver") {
        return true;
      }
    }
  }
  return false;
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

  // Note: this being here before the Watcher check means dying to a watcher while flying and falling into the solution IS accounted for.
  const nodeDecision = await onNode(state, path, g, h);
  if (nodeDecision === "found") return "found";

  // Begin pruning. //

  const { row, col } = state.player;

  // All Watcher statues triggered.
  if (allWatchersTriggeredQuestion(state.entities)) {
    console.log("INF: all watchers");
    return Infinity;
  }

  // All but one watcher statue is triggered (thus, staff usage is banned) and the player doesn't have wings (can't do the watcher-strike into pit strat)
  if (
    !hasWings &&
    state.player.staffContent !== "stairs" &&
    staffBanned(state.entities) &&
    !hereBeMovers(state.entities)
  ) {
    console.log("INF: staff banned, not holding stairs, no wings");
    return Infinity;
  }

  // Useless for brandcarving.
  // There are more holes where tiles should be than there are inactive watchers.
  //const inactiveWatchers = countInactiveWatchers(state.entities);
  //if (inactiveWatchers > 0 && countDeficits(state.board,target)*2 - Number(state.player.staffContent !== "empty") >= inactiveWatchers+Number(hasWings)) {
  //  console.log("INF: too many watchers for deficits");
  //  return Infinity;
  //}

  // Exit step: player is in the void but not at goal — dead end.
  // Exception: if wings are active the player is still airborne and can land.
  if (state.board[row]?.[col] === "empty" && !state.player.wingsActive) {
    //console.log("INF: pitfall");
    return Infinity;
  }

  // Pruning: not enough floor tiles remaining to satisfy the target.
  const floorInStaff =
    (
      ["floor", "glass", "button", "trap_inactive", "trap_active"].includes(
        state.player.staffContent,
      )
    ) ?
      1
    : 0;
  if (countFloorTiles(state.board) + floorInStaff < numFloorTilesInSolution) {
    //console.log("INF: not enough tiles");
    return Infinity;
  }

  // Pruning: We have a rock in a corner where there shouldn't be one.
  // Intentionally not including monster statues here.
  for (let coord of [
    [0, 0],
    [0, 5],
    [5, 0],
    [5, 5],
  ]) {
    let r: number = coord[0]!;
    let c: number = coord[1]!;

    if (
      state.entities[r]![c]! === "rock" ||
      state.entities[r]![c]! === "watcher_inactive" ||
      state.entities[r]![c]! === "watcher_active" ||
      state.entities[r]![c]! === "chest"
    ) {
      // The cornered rock is covering stairs.
      if (state.board[r]![c]! === "stairs") {
        //console.log("INF: cornered rock covering stairs" + String(coord));
        return Infinity;
      }
      // Rock is covering a land tile that shouldn't be there, and there's no conceivable way to get it off.
      else if (
        target[r]![c]! === "empty" &&
        state.board[r]![c]! !== "trap_active"
      ) {
        //console.log("INF: cornered rock covering excess tile: " + String(coord));
        return Infinity;
      }
    }
  }
  // The same thing but for "near corners"; a rock can be stuck against another rock.
  for (let i = 0; i <= 14; i += 2) {
    let coords = [
      0,
      1, //nw
      1,
      0,

      0,
      4, //ne
      1,
      5,

      4,
      0, //sw
      5,
      1,

      4,
      5, //se
      5,
      4,
    ];

    let r: number = coords[i]!;
    let c: number = coords[i + 1]!;

    const blockers = ["rock", "watcher_inactive", "watcher_active", "chest"];

    if (blockers.includes(state.entities[r]![c]!)) {
      // Rock stuck.
      const r2: number =
        i == 0 || i == 2 ? 0
        : i == 4 || i == 6 ? 0
        : i == 8 || i == 10 ? 5
        : i == 12 || i == 14 ? 5
        : 256;
      const c2: number =
        i == 0 || i == 2 ? 0
        : i == 4 || i == 6 ? 5
        : i == 8 || i == 10 ? 0
        : i == 12 || i == 14 ? 5
        : 256;

      if (blockers.includes(state.entities[r2]![c2]!)) {
        // The cornered rock is covering stairs.
        if (state.board[r]![c]! === "stairs") {
          //console.log("INF: side-cornered rock covering stairs");
          return Infinity;
        }
        // Rock is covering a land tile that shouldn't be there, and there's no conceivable way to get it or the cornered one off.
        else if (
          target[r]![c]! === "empty" &&
          state.board[r]![c]! !== "trap_active" &&
          state.board[r2]![c2]! !== "trap_active"
        ) {
          //console.log("INF: side-cornered rock covering excess tile");
          return Infinity;
        }
      }
    }
  }

  // End pruning. //

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

  const progressSamples =
    showProgress ?
      await sampleProgressCheckpoints(
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
  // Initialised to 0 so the first log fires immediately rather than waiting 3s.
  let lastLogTime = 0;

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
