import { test } from "node:test";
import assert from "node:assert/strict";
import { aStar } from "./search";
import type { Board, Cell, Direction, GameState, StaffContent } from "./types";

function makeState(
  row: number,
  col: number,
  facing: Direction,
  staffContent: StaffContent,
  cells: Array<[number, number, Cell]> = []
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

test("aStar finds optimal path through glass to collect stairs", () => {
  // Initial board:          Target board:
  //   ┌────────────┐         ┌────────────┐
  //   │⇒ ░░██      │         │██  ██      │
  //   │    ██      │         │    ██      │
  //   │    S       │         │            │
  //   │            │         │            │
  //   │            │         │            │
  //   │            │         │            │
  //   └────────────┘         └────────────┘
  //   ⇒ player (arrow shows facing direction)  █ floor  ░ glass  S stairs  (space) empty
  //
  // The player must walk right twice (breaking the glass on departure),
  // then down, then use the staff to collect the stairs.
  // Optimal: right, right, down, staff (4 steps).

  const initial = makeState(0, 0, "right", "empty", [
    [0, 0, "floor"],
    [0, 1, "glass"],
    [0, 2, "floor"],
    [1, 2, "floor"],
    [2, 2, "stairs"],
  ]);

  const target = makeBoard([
    [0, 0, "floor"],
    [0, 2, "floor"],
    [1, 2, "floor"],
  ]);

  const path = aStar(initial, target);
  assert.deepEqual(path, ["right", "right", "down", "staff"]);
});
