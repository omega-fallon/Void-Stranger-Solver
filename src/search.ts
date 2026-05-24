import {
  ACTIONS,
  applyAction,
  isGoal,
  renderBoard,
  stateKey,
} from "./gameState";
import { heuristic } from "./heuristic";
import { MinHeap } from "./priorityQueue";
import type { Action, Board, GameState, SearchNode } from "./types";

export async function aStar(
  initial: GameState,
  target: Board,
  verbose = false,
  slow = false,
): Promise<Action[] | null> {
  const open = new MinHeap();
  const closed = new Set<string>();

  open.push({
    state: initial,
    gCost: 0,
    hCost: heuristic(initial, target),
    action: null,
    parent: null,
  });

  while (open.size > 0) {
    const current = open.pop()!;
    const key = stateKey(current.state);
    if (closed.has(key)) continue;
    closed.add(key);

    if (verbose) {
      const action = current.action ?? "start";
      console.log(
        `Explored: ${closed.size} states | Path length: ${
          current.gCost
        } | Action: ${action}\n${renderBoard(current.state)}`,
      );
    }

    if (slow) await new Promise<void>((resolve) => setTimeout(resolve, 100));

    if (isGoal(current.state, target)) return reconstructPath(current);

    // Player has stepped into the void — no further moves are meaningful.
    const { row, col } = current.state.player;
    if (current.state.board[row]?.[col] === "empty") continue;

    for (const action of ACTIONS) {
      const next = applyAction(current.state, action);
      if (!next) continue;
      if (closed.has(stateKey(next))) continue;
      open.push({
        state: next,
        gCost: current.gCost + 1,
        hCost: heuristic(next, target),
        action,
        parent: current,
      });
    }
  }

  return null;
}

function reconstructPath(node: SearchNode): Action[] {
  const path: Action[] = [];
  let cur: SearchNode | null = node;
  while (cur?.action) {
    path.push(cur.action);
    cur = cur.parent;
  }
  return path.reverse();
}
