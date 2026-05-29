import {
  ACTIONS,
  applyAction,
  isGoal,
  renderBoard,
  stateKey,
} from "./gameState";
import { heuristic } from "./heuristic";
import type { Action, Board, GameState } from "./types";

export interface SearchResult {
  path: Action[] | null;
  nodesExplored: number;
  elapsedMs: number;
}

export function countFloorTiles(board: Board): number {
  return board
    .flat()
    .reduce(
      (n, cell) => n + (["floor", "wall", "glass", "button", "trap_inactive", "trap_active"].includes(cell) ? 1 : 0),
      0,
    );
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

    if (isGoal(state, target, requireFinalJump)) return "found";

    // Exit step: player is in the void but not at goal — dead end.
    // Exception: if wings are active the player is still airborne and can land.
    const { row, col } = state.player;
    if (state.board[row]?.[col] === "empty" && !state.player.wingsActive)
      return Infinity;

    // Pruning: not enough floor tiles remaining to satisfy the target.
    const floorInStaff = ["floor", "glass", "button", "trap_inactive", "trap_active"].includes(state.player.staffContent)
      ? 1
      : 0;
    if (countFloorTiles(state.board) + floorInStaff < numFloorTilesInSolution) {
      return Infinity;
    }
    
    // Pruning: We have a rock in a corner where there shouldn't be one.
    for (let coord of [[0,0],[0,5],[5,0],[5,5]]) {
      let r : number = coord[0]!;
      let c : number = coord[1]!;
    
      if (state.entities[r]![c]! === "rock") {
        // The cornered rock is covering stairs.
        if (state.board[r]![c]! === "stairs") {
          console.log("trimmed1");
          return Infinity;
        }
        // Rock is covering a land tile that shouldn't be there, and there's no conceivable way to get it off.
        else if (target[r]![c]! === "empty" || state.board[r]![c]! !== "trap_active") {
          console.log("trimmed2");
          return Infinity;
        }
      }
    }
    // The same thing but for "near corners"; a rock can be stuck against another rock.
    for (let i = 0; i < 16; i += 2) {
      let coords = [
        0,1,//nw
        1,0,
        
        0,4,//ne
        1,5,
        
        4,0,//sw
        5,1,
        
        4,5,//se
        5,4
      ]
    
      let r : number = coords[i]!;
      let c : number = coords[i+1]!;
    
      if (state.entities[r]?.[c] === "rock") {
        // Rock stuck.
        if (((i == 0 || i == 2) && (state.entities[0]![0]! === "rock")) || ((i == 4 || i == 6) && (state.entities[0]![5]! === "rock")) || ((i == 8 || i == 10) && (state.entities[5]![0]! === "rock")) || ((i == 12 || i == 14) && (state.entities[5]![5]! === "rock"))) {
          // The cornered rock is covering stairs.
          if (state.board[r]![c]! === "stairs") {
            console.log("trimmed3");
            return Infinity;
          }
          // Rock is covering a land tile that shouldn't be there, and there's no conceivable way to get it off.
          else if (target[r]![c]! === "empty" || state.board[r]![c]! !== "trap_active") {
            console.log("trimmed4");
            return Infinity;
          }
        }
      }
    }
    
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
    const result = await searchWithThreshold(initial, 0, path);

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
