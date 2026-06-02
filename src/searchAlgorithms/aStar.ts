import {
  ACTIONS,
  applyAction,
  isGoal,
  renderBoard,
  stateKey,
} from "../gameState";
import { heuristic } from "../heuristic";
import { MinHeap } from "../priorityQueue";
import { NO_BURDENS } from "../types";
import type { Action, Burdens, SearchNode } from "../types";
import {
  countFloorTiles,
  isPruned,
  type SearchOptions,
  type SearchResult,
} from "./shared";

/**
 * Standard A* — best-first search using a min-heap ordered by f = g + h, plus
 * a closed set to avoid re-expanding states.
 *
 * Unlike IDA* and RBFS, A* never re-explores a node once it has been expanded
 * (a consistent heuristic guarantees the first expansion is optimal).  This
 * avoids the redundant re-traversal that IDA* performs across threshold
 * iterations, at the cost of keeping the entire frontier in memory.
 *
 * Path reconstruction follows parent pointers stored in each SearchNode.
 *
 * Note: `initialThreshold` is not used — A* finds the optimal solution
 * without an external threshold.
 */
export async function aStar({
  initial,
  target,
  verbose = 0,
  slow = false,
  requireFinalJump = true,
  burdens = NO_BURDENS,
  actions = ACTIONS,
}: SearchOptions): Promise<SearchResult> {
  const numFloorTilesInSolution = countFloorTiles(target);
  const showProgress = verbose >= 2;

  const open = new MinHeap();
  // Closed set stores state keys to avoid re-expansion.
  // The path back to the root is preserved via parent pointers in each SearchNode.
  const closed = new Set<string>();
  let nodesExplored = 0;

  const initialH = heuristic(initial, target, requireFinalJump).total;
  open.push({
    state: initial,
    gCost: 0,
    hCost: initialH,
    action: null,
    parent: null,
  });

  const start = performance.now();
  let lastLogTime = 0;

  while (open.size > 0) {
    const current = open.pop()!;
    const currentKey = stateKey(current.state);

    // Lazy-deletion: a state may be in the heap multiple times if reached via
    // different paths.  Only the first expansion (lowest g) is canonical.
    if (closed.has(currentKey)) continue;
    closed.add(currentKey);
    nodesExplored++;

    const now = performance.now();
    if (showProgress && (verbose >= 3 || now - lastLogTime >= 3000)) {
      lastLogTime = now;
      const elapsedMs = now - start;
      const nodesPerSec = Math.round((nodesExplored / elapsedMs) * 1000);
      console.log(
        `Open: ${open.size} | Closed: ${closed.size} | Explored: ${nodesExplored} | ` +
          `${(elapsedMs / 1000).toFixed(0)}s | ${nodesPerSec} nodes/sec\n` +
          `g=${current.gCost} | f=${current.gCost + current.hCost} (${current.gCost}g+${current.hCost}h)\n` +
          `${renderBoard(current.state, numFloorTilesInSolution)}`,
      );
    }

    if (slow) await new Promise<void>((resolve) => setTimeout(resolve, 100));

    if (isGoal(current.state, target, requireFinalJump)) {
      const elapsedMs = performance.now() - start;
      if (verbose) {
        console.log(
          `A* done | ${nodesExplored} nodes | ${elapsedMs.toFixed(0)}ms | ${(
            nodesExplored /
            (elapsedMs / 1000)
          ).toFixed(0)} nodes/sec`,
        );
      }
      return { path: reconstructPath(current), nodesExplored, elapsedMs };
    }

    if (isPruned(current.state, target, burdens, numFloorTilesInSolution))
      continue;

    for (const action of actions) {
      const next = applyAction(current.state, action, burdens);
      if (!next) continue;
      if (closed.has(stateKey(next))) continue;

      const nextH = heuristic(next, target, requireFinalJump).total;
      open.push({
        state: next,
        gCost: current.gCost + 1,
        hCost: nextH,
        action,
        parent: current,
      });
    }
  }

  const elapsedMs = performance.now() - start;
  if (verbose) {
    console.log(
      `A* done (no solution) | ${nodesExplored} nodes | ${elapsedMs.toFixed(0)}ms`,
    );
  }
  return { path: null, nodesExplored, elapsedMs };
}

/** Walks the parent-pointer chain from `node` back to the root to rebuild the action sequence. */
export function reconstructPath(node: SearchNode): Action[] {
  const path: Action[] = [];
  let current: SearchNode | null = node;
  while (current !== null && current.action !== null) {
    path.unshift(current.action);
    current = current.parent;
  }
  return path;
}
