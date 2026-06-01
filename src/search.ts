import {
  ACTIONS,
  applyAction,
  isGoal,
  renderBoard,
  stateKey,
} from "./gameState";
import { heuristic } from "./heuristic";
import type { Action, Board, EntityGrid, GameState } from "./types";

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
        ([
          "floor",
          "wall",
          "glass",
          "button",
          "trap_inactive",
          "trap_active",
        ].includes(cell)
          ? 1
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

export interface SearchOptions {
  initial: GameState;
  target: Board;
  verbose?: number;
  slow?: boolean;
  requireFinalJump?: boolean;
  initialThreshold?: number | undefined;
  knownCorrectPath?: Action[] | undefined; // DEBUG
  hasWings?: boolean;
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
}: SearchOptions): Promise<SearchResult> {
  const numFloorTilesInSolution = countFloorTiles(target);

  if (verbose === 2 && initialThreshold)
    console.log(`Searching with initial threshold ${initialThreshold}`);

  let threshold =
    initialThreshold ?? heuristic(initial, target, requireFinalJump).total;
  let nodesExplored = 0;
  let loopsPrevented = 0;
  let pathsTrimmed = 0;
  const start = performance.now();

  // Per-path visited set — prevents cycles within a single DFS path.
  // Memory is O(depth), never grows beyond the path length.
  const visited = new Set<string>();
  visited.add(stateKey(initial));

  // DEBUG
  let maxCorrectSoFar = 0;
  // END DEBUG

  // Returns "found" on success, Infinity if this subtree is unsolvable, or the
  // minimum f-cost that exceeded the current threshold (next threshold to try).
  async function searchWithThreshold(
    state: GameState,
    g: number,
    path: Action[],
  ): Promise<"found" | number> {
    const h = heuristic(state, target, requireFinalJump).total;
    const f = g + h;

    const amountOfPathFound = (() => {
      for (let i = 0; i < knownCorrectPath.length; i++) {
        if (knownCorrectPath[i] !== path[i]) {
          return i;
        }
      }
      return knownCorrectPath.length;
    })();

    if (f > threshold) {
      pathsTrimmed++;
      return f;
    }

    nodesExplored++;

    if (verbose >= 2 && (verbose >= 3 || Math.random() < 0.00001)) {
      const elapsedMs = performance.now() - start;
      const nodesPerSec = Math.round((nodesExplored / elapsedMs) * 1000);
      const action = path.at(-1) ?? "start";

      console.log(
        `Threshold: ${threshold} | Explored: ${nodesExplored} | ${loopsPrevented} loops prevented | ${pathsTrimmed} paths trimmed | ` +
          `${(elapsedMs / 1000).toFixed(0)}s | ${nodesPerSec} nodes/sec\n` +
          `Path: ${g} | f=${f} (${g}g+${h}h) | ${amountOfPathFound} correct / ${knownCorrectPath.length} | Action: ${action}\n` +
          `${renderBoard(state, numFloorTilesInSolution)}`,
      );
    }

    if (slow) await new Promise<void>((resolve) => setTimeout(resolve, 100));

    // Note: this being here before the Watcher check means dying to a watcher while flying and falling into the solution IS accounted for.
    if (isGoal(state, target, requireFinalJump)) return "found";

    // Begin pruning. //

    const { row, col } = state.player;

    // All Watcher statues triggered.
    if (allWatchersTriggeredQuestion(state.entities)) {
      console.log("INF: all watchers");
      return Infinity;
    }

    // All but one watcher statue is triggered (thus, staff usage is banned) and the player doesn't have wings (can't do the watcher-strike into pit strat)
    if (
      staffBanned(state.entities) &&
      state.player.staffContent !== "stairs" &&
      !hasWings
    ) {
      console.log("INF: staff banned, not holding stairs, no wings");
      return Infinity;
    }

    // Exit step: player is in the void but not at goal — dead end.
    // Exception: if wings are active the player is still airborne and can land.
    if (state.board[row]?.[col] === "empty" && !state.player.wingsActive) {
      //console.log("INF: pitfall");
      return Infinity;
    }

    // Pruning: not enough floor tiles remaining to satisfy the target.
    const floorInStaff = [
      "floor",
      "glass",
      "button",
      "trap_inactive",
      "trap_active",
    ].includes(state.player.staffContent)
      ? 1
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
          console.log("INF: cornered rock covering stairs" + String(coord));
          return Infinity;
        }
        // Rock is covering a land tile that shouldn't be there, and there's no conceivable way to get it off.
        else if (
          target[r]![c]! === "empty" &&
          state.board[r]![c]! !== "trap_active"
        ) {
          console.log(
            "INF: cornered rock covering excess tile: " + String(coord),
          );
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
          i == 0 || i == 2
            ? 0
            : i == 4 || i == 6
              ? 0
              : i == 8 || i == 10
                ? 5
                : i == 12 || i == 2
                  ? 5
                  : 256;
        const c2: number =
          i == 0 || i == 2
            ? 0
            : i == 4 || i == 6
              ? 5
              : i == 8 || i == 10
                ? 0
                : i == 12 || i == 2
                  ? 5
                  : 256;

        if (blockers.includes(state.entities[r2]![c2]!)) {
          // The cornered rock is covering stairs.
          if (state.board[r]![c]! === "stairs") {
            console.log("INF: side-cornered rock covering stairs");
            return Infinity;
          }
          // Rock is covering a land tile that shouldn't be there, and there's no conceivable way to get it or the cornered one off.
          else if (
            target[r]![c]! === "empty" &&
            state.board[r]![c]! !== "trap_active" &&
            state.board[r2]![c2]! !== "trap_active"
          ) {
            console.log("INF: side-cornered rock covering excess tile");
            return Infinity;
          }
        }
      }
    }

    // End pruning. //
    let min = Infinity;

    for (const action of ACTIONS) {
      const next = applyAction(state, action, hasWings);
      // console.log(
      //   "Trying action:",
      //   action,
      //   "path is:",
      //   path,
      //   "next state is:",
      //   next && renderBoard(next!),
      // );
      if (!next) {
        // console.log("No next state returned, skipping");
        continue;
      }

      // Loop prevention speeds up searches by about 6x at threshold 20, 4x at threshold 26
      const nextKey = stateKey(next);
      if (visited.has(nextKey)) {
        loopsPrevented++;
        continue;
      }
      visited.add(nextKey);

      path.push(action);

      const result = await searchWithThreshold(next, g + 1, path);

      if (result === "found") return "found"; // path is intact — don't pop

      path.pop();
      visited.delete(nextKey);

      if (result < min) min = result;
    }

    return min;
  }

  while (true) {
    const path: Action[] = [];

    //console.log("Beginning...");
    const result = await searchWithThreshold(initial, 0, path);
    //console.log("End.");

    const elapsedMs = performance.now() - start;
    if (verbose) {
      console.log(
        `--- Threshold ${threshold}, result: ${result} | ${nodesExplored} nodes so far | ${elapsedMs.toFixed(
          0,
        )}ms | ${(nodesExplored / (elapsedMs / 1000)).toFixed(
          0,
        )} nodes/sec ---`,
      );
    }

    if (result === "found") return { path, nodesExplored, elapsedMs };
    if (result === Infinity) return { path: null, nodesExplored, elapsedMs };

    threshold = result;
  }
}
