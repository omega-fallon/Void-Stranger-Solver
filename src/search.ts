import {
  ACTIONS,
  applyAction,
  isGoal,
  renderBoard,
  replayPath,
  stateKey,
} from "./gameState";
import { heuristic } from "./heuristic";
import { MinHeap } from "./priorityQueue";
import type { Action, Board, GameState, SearchNode } from "./types";

export interface SearchResult {
  path: Action[] | null;
  nodesExplored: number;
}

export function countFloorTiles(board: Board) {
  return board
    .flat()
    .map((cell): number => {
      return ["floor", "wall", "glass"].includes(cell) ? 1 : 0;
    })
    .reduce((a, v) => a + v);
}

export async function aStar(
  initial: GameState,
  target: Board,
  verbose = false,
  slow = false,
): Promise<SearchResult> {
  const numFloorTilesInSolution = countFloorTiles(target);

  const open = new MinHeap();
  const closed = new Set<string>();

  open.push({
    state: initial,
    gCost: 0,
    hCost: heuristic(initial, target),
    action: null,
    parent: null,
  });

  let nodesExplored = 0;
  let duplicateNodes = 0;
  const start = performance.now();
  while (open.size > 0) {
    const current = open.pop()!;

    const elapsedMs = performance.now() - start;
    nodesExplored++;
    const nodesPerSec = Math.round((nodesExplored / elapsedMs) * 1000);

    const key = stateKey(current.state);
    if (closed.has(key)) {
      duplicateNodes++;
      continue;
    }
    closed.add(key);

    if (verbose && Math.random() < 0.0001) {
      const action = current.action ?? "start";
      console.log(
        `Explored: ${closed.size} states + ${duplicateNodes} duplicates, ${
          open.size
        } open | ${elapsedMs.toFixed(
          1,
        )}ms | ${nodesPerSec} nodes/sec\nPath length: ${
          current.gCost
        } | Cost: ${current.gCost + current.hCost} = ${current.gCost}g + ${
          current.hCost
        }h | Action: ${action}\n${renderBoard(
          current.state,
          numFloorTilesInSolution,
        )}`,
      );
    }

    if (slow) await new Promise<void>((resolve) => setTimeout(resolve, 100));

    if (isGoal(current.state, target))
      return { path: reconstructPath(current), nodesExplored: closed.size };

    // Player has stepped into the void — no further moves are meaningful.
    const { row, col } = current.state.player;
    if (current.state.board[row]?.[col] === "empty") continue;

    // Check if we've consumed too many tiles for the solution to be possible
    const numFloorTilesRemaining =
      countFloorTiles(current.state.board) +
      (["floor", "glass"].includes(current.state.player.staffContent) ? 1 : 0);
    if (numFloorTilesRemaining < numFloorTilesInSolution) continue;

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

  return { path: null, nodesExplored: closed.size };
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
