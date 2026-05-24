import type { Board, GameState } from "./types";

export function heuristic(state: GameState, target: Board): number {
  let count = 0;
  for (let r = 0; r < 6; r++)
    for (let c = 0; c < 6; c++)
      if (state.board[r]![c] !== target[r]![c]) count++;
  return count;
}
