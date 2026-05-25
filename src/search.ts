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
      (n, cell) => n + (["floor", "wall", "glass"].includes(cell) ? 1 : 0),
      0,
    );
}

export async function search(
  initial: GameState,
  target: Board,
  verbose: boolean | number = false,
  slow = false,
  requireFinalJump = true,
  initialThreshold?: number,
): Promise<SearchResult> {
  const numFloorTilesInSolution = countFloorTiles(target);

  if (verbose == 2 && initialThreshold)
    console.log(`Searching with initial threshold ${initialThreshold}`);

  let threshold = initialThreshold ?? heuristic(initial, target);
  let nodesExplored = 0;
  let loopsPrevented = 0;
  const start = performance.now();

  // Per-path visited set — prevents cycles within a single DFS path.
  // Memory is O(depth), never grows beyond the path length.
  const visited = new Set<string>();
  visited.add(stateKey(initial));

  // DEBUG
  let maxCorrectSoFar = 0;
  const eusSolutionPath = "LRURDRZLLZLZRRZRDLZDZDZLDR".split("").map((l) => {
    return {
      L: "left",
      R: "right",
      U: "up",
      D: "down",
      Z: "staff",
    }[l];
  });
  // END DEBUG

  // Returns "found" on success, Infinity if this subtree is unsolvable, or the
  // minimum f-cost that exceeded the current threshold (next threshold to try).
  async function searchWithThreshold(
    state: GameState,
    g: number,
    path: Action[],
  ): Promise<"found" | number> {
    const h = heuristic(state, target);
    const f = g + h;
    if (f > threshold) return f;

    nodesExplored++;

    const amountOfPathFound = (() => {
      for (let i = 0; i < eusSolutionPath.length; i++) {
        if (eusSolutionPath[i] != path[i]) {
          return i;
        }
      }
      return eusSolutionPath.length;
    })();
    maxCorrectSoFar = Math.max(amountOfPathFound, maxCorrectSoFar);

    if (verbose == 2 && Math.random() < 0.00001) {
      const elapsedMs = performance.now() - start;
      const nodesPerSec = Math.round((nodesExplored / elapsedMs) * 1000);
      const action = path.at(-1) ?? "start";

      // console.log(path);
      // console.log(eusSolutionPath);
      console.log(
        `Threshold: ${threshold} | Explored: ${nodesExplored} | ${loopsPrevented} loops prevented | ` +
          `${elapsedMs.toFixed(1)}ms | ${nodesPerSec} nodes/sec\n` +
          `Path: ${g} | f=${f} (${g}g+${h}h) | ${amountOfPathFound} correct | Action: ${action}\n` +
          `${renderBoard(state, numFloorTilesInSolution)}`,
      );
    }

    if (slow) await new Promise<void>((resolve) => setTimeout(resolve, 100));

    if (isGoal(state, target, requireFinalJump)) return "found";

    // Exit step: player is in the void but not at goal — dead end.
    const { row, col } = state.player;
    if (state.board[row]?.[col] === "empty") return Infinity;

    // Pruning: not enough floor tiles remaining to satisfy the target.
    const floorInStaff = ["floor", "glass"].includes(state.player.staffContent)
      ? 1
      : 0;
    if (countFloorTiles(state.board) + floorInStaff < numFloorTilesInSolution) {
      return Infinity;
    }

    let min = Infinity;

    for (const action of ACTIONS) {
      const next = applyAction(state, action);
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
        `--- Threshold ${threshold} | ${nodesExplored} nodes so far | ${elapsedMs.toFixed(
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
