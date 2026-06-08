import { NO_BURDENS } from "../types";
import type { Action, Board, Burdens, EntityGrid, GameState, Cell, Entity } from "../types";
import { renderState } from "../gameState";

const verbose = Number(process.env.VERBOSE);

export interface DfsCounters {
  nodesExplored: number;
  loopsPrevented: number;
  pathsTrimmed: number;
}

export interface SearchResult {
  path: Action[] | null;
  nodesExplored: number;
  elapsedMs: number;
}

export interface SearchOptions {
  initial: GameState;
  target: Board;
  verbose?: number;
  slow?: boolean;
  requireFinalJump?: boolean;
  initialThreshold?: number | undefined;
  knownCorrectPath?: Action[] | undefined;
  burdens?: Burdens;
  actions?: Action[];
  algorithm?: "idaStar" | "rbfs" | "aStar" | "aStarThenIdaStar";
  /** Only used by `aStarThenIdaStar`: how many layers A* expands before handing off to IDA*. Default 10. */
  frontierDepth?: number;
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
  return false;
  let found_inactive: number = 0;
  for (let i = 0; i < 6; i++) {
    for (let i2 = 0; i2 < 6; i2++) {
      if (entities[i]![i2]! === "watcher_inactive") {
        found_inactive++;
        
        // 2 inactive statues means we have at least one safe usage.
        if (found_inactive >= 2) {
          return false;
        }
      }
    }
  }
  return found_inactive === 1;
}

/**
 * Returns true if this state is a dead end and should be pruned from the search.
 *
 * Checks (in order):
 *  1. All watcher statues have been triggered (game over).
 *  2. All-but-one watchers triggered and staff can't be used to escape.
 *  3. Player fell into the void without wings active.
 *  4. Not enough floor tiles remain to satisfy the target board.
 *  5. A rock/watcher/chest is trapped in a corner it can never leave.
 *  6. Same as (5) but for the cell adjacent to a corner ("near-corner").
 */
export function isPruned(
  state: GameState,
  target: Board,
  burdens: Burdens,
  numFloorTilesInSolution: number,
): boolean | string {
  const { row, col } = state.player;

  // All Watcher statues triggered.
  if (allWatchersTriggeredQuestion(state.entities)) {
    if (verbose >= 3) console.log("INF: all watchers");
    return "all watchers triggered";
  }

  // All but one watcher statue is triggered (staff usage banned) and the
  // player doesn't have wings (can't do the watcher-strike into pit strat).
  if (
    staffBanned(state.entities) &&
    state.player.staffContent !== "stairs" &&
    !burdens.wings
  ) {
    if (verbose >= 3)
      console.log("INF: staff banned, not holding stairs, no wings");
    return "staff banned";
  }

  // Player is in the void but not at goal — dead end.
  // Exception: if wings are active the player is still airborne and can land.
  if (state.board[row]?.[col] === "empty" && !state.player.wingsActive) {
    if (verbose >= 3)
      console.log("INF: Player is on empty tile but wings are not active");
    return "you have fallen (prematurely)";
  }

  // Not enough floor tiles remaining to satisfy the target.
  const floorInStaff =
    (
      ["floor", "glass", "button", "trap_inactive", "trap_active"].includes(
        state.player.staffContent,
      )
    ) ?
      1
    : 0;
  if (countFloorTiles(state.board) + floorInStaff < numFloorTilesInSolution) {
    return "not enough tiles remain";
  }

  // A rock/watcher/chest in a corner it can never leave.
  // Intentionally not including monster statues here.
  for (const coord of [
    [0, 0],
    [0, 5],
    [5, 0],
    [5, 5],
  ]) {
    const r : number = coord[0]!;
    const c : number  = coord[1]!;
    
    const covered_tile : Cell = state.board[r]![c]!
    const covering_entity : Entity = state.entities[r]![c]!;

    if (
      covering_entity === "rock" ||
      covering_entity === "watcher_inactive" ||
      covering_entity === "watcher_active" ||
      covering_entity === "chest"
    ) {
      // The cornered entity is covering stairs.
      if (state.board[r]![c]! === "stairs") {
        console.log("INF: cornered rock covering stairs" + String(coord));
        return "There's a rock covering the stairs in a corner (so stairs are unreachable)";
      }
      // Entity is covering a land tile that shouldn't be there.
      if (target[r]![c]! === "empty" && state.board[r]![c]! !== "trap_active") {
        console.log(
          "INF: cornered rock covering excess tile: " + String(coord),
        );
        return "There's a rock covering a that that must be removed in a corner";
      }
    }
  }

  // Same but for "near corners"; a rock can be stuck against another rock.
  for (let i = 0; i <= 14; i += 2) {
    // prettier-ignore
    const coords = [
      0, 1, //nw
      1, 0,
      0, 4, //ne
      1, 5,
      4, 0, //sw
      5, 1,
      4, 5, //se
      5, 4,
    ];

    const r = coords[i]!;
    const c = coords[i + 1]!;

    const blockers = ["rock", "watcher_inactive", "watcher_active", "chest"];

    if (blockers.includes(state.entities[r]![c]!)) {
      const r2: number =
        i === 0 || i === 2 ? 0
        : i === 4 || i === 6 ? 0
        : i === 8 || i === 10 ? 5
        : i === 12 || i === 14 ? 5
        : 256;
      const c2: number =
        i === 0 || i === 2 ? 0
        : i === 4 || i === 6 ? 5
        : i === 8 || i === 10 ? 0
        : i === 12 || i === 14 ? 5
        : 256;

      if (blockers.includes(state.entities[r2]![c2]!)) {
        if (state.board[r]![c]! === "stairs") {
          console.log("INF: side-cornered rock covering stairs");
          return "side-cornered rock covering stairs";
        }
        if (
          target[r]![c]! === "empty" &&
          state.board[r]![c]! !== "trap_active" &&
          state.board[r2]![c2]! !== "trap_active"
        ) {
          console.log("INF: side-cornered rock covering excess tile");
          return "side-cornered rock covering excess tile";
        }
      }
    }
  }

  return false;
}
