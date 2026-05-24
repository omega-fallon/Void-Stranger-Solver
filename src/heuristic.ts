import type { Board, GameState } from "./types";

export function heuristic(state: GameState, target: Board): number {
  let count = 0;
  for (let r = 0; r < 6; r++)
    for (let c = 0; c < 6; c++) {
      let currentCell = state.board[r]![c]!;
      if (currentCell !== target[r]![c]) {
        count++;
        // if (currentCell === "glass") {
        //   count++; // glass we can break by simply stepping onto it
        // } else if (["floor", "empty"].includes(currentCell)) {
        //   count += 2; // for each one that's wrong, we have to move + staff twice at the near-very minimum. This could overestimate if you don't have to move for the first one, so it may not be valid.
        // } else {
        //   // Unhandled tile type
        //   count++;
        // }
      }
    }
  return count; // - (count > 0 ? 1 : 0); // subtract one for in case you don't need to take the first step to pick something up
}
