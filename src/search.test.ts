import { test } from "node:test";
import assert from "node:assert/strict";
import { aStar } from "./search";
import type { Board, Cell, Direction, GameState, StaffContent } from "./types";

function makeState(
  row: number,
  col: number,
  facing: Direction,
  staffContent: StaffContent,
  cells: Array<[number, number, Cell]> = [],
): GameState {
  const board = Array.from({ length: 6 }, () => Array<Cell>(6).fill("empty"));
  for (const [r, c, v] of cells) board[r]![c] = v;
  return { board, player: { row, col, facing, staffContent } };
}

function makeBoard(cells: Array<[number, number, Cell]> = []): Board {
  const board = Array.from({ length: 6 }, () => Array<Cell>(6).fill("empty"));
  for (const [r, c, v] of cells) board[r]![c] = v;
  return board;
}

test("aStar finds optimal path through glass to collect stairs", async () => {
  // Initial board:          Target board:
  //   ┌────────────┐         ┌────────────┐
  //   │⇒ ░░██      │         │██  ██      │
  //   │  ████████  │         │  ████████  │
  //   │    S       │         │            │
  //   │            │         │            │
  //   │            │         │            │
  //   │            │         │            │
  //   └────────────┘         └────────────┘
  //   ⇒ player (arrow shows facing direction)  █ floor  ░ glass  S stairs  (space) empty
  //
  // The player walks right twice (breaking the glass on departure), then
  // down, collects the stairs with staff, then steps down into the now-empty
  // (2,2) cell to exit. Floor tiles at (1,1) and (1,3) block left/right exits
  // so only the "down" exit is valid, making the path deterministic.
  // Optimal: right, right, down, staff, down (5 steps).

  const initial = makeState(0, 0, "right", "empty", [
    [0, 0, "floor"],
    [0, 1, "glass"],
    [0, 2, "floor"],
    [1, 1, "floor"],
    [1, 2, "floor"],
    [1, 3, "floor"],
    [2, 2, "stairs"],
  ]);

  const target = makeBoard([
    [0, 0, "floor"],
    [0, 2, "floor"],
    [1, 1, "floor"],
    [1, 2, "floor"],
    [1, 3, "floor"],
  ]);

  const path = await aStar(initial, target);
  assert.deepEqual(path, ["right", "right", "down", "staff", "down"]);
});
