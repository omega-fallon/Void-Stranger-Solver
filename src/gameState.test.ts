import { test } from "node:test";
import assert from "node:assert/strict";
import { applyAction } from "./gameState";
import type { Cell, Direction, GameState, StaffContent } from "./types";

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

// Movement

test("move into floor updates position and facing", () => {
  const s = makeState(1, 0, "down", "empty", [
    [0, 0, "floor"],
    [1, 0, "floor"],
  ]);
  const r = applyAction(s, "up")!;
  assert.equal(r.player.row, 0);
  assert.equal(r.player.col, 0);
  assert.equal(r.player.facing, "up");
  assert.equal(r.board[1]![0], "floor"); // origin cell unchanged
});

test("move into empty moves player there (exit step)", () => {
  const s = makeState(1, 0, "down", "empty", [[1, 0, "floor"]]);
  const r = applyAction(s, "up")!;
  assert.equal(r.player.row, 0);
  assert.equal(r.player.col, 0);
  assert.equal(r.board[0]![0], "empty"); // destination cell stays empty
});

test("move out of bounds returns null", () => {
  const s = makeState(0, 0, "up", "empty", [[0, 0, "floor"]]);
  assert.equal(applyAction(s, "up"), null);
});

test("move onto stairs returns null (stairs is not walkable)", () => {
  const s = makeState(1, 0, "down", "empty", [
    [0, 0, "stairs"],
    [1, 0, "floor"],
  ]);
  assert.equal(applyAction(s, "up"), null);
});

// Glass

test("stepping off glass breaks it", () => {
  const s = makeState(0, 0, "right", "empty", [
    [0, 0, "glass"],
    [0, 1, "floor"],
  ]);
  const r = applyAction(s, "right")!;
  assert.equal(r.player.col, 1);
  assert.equal(r.board[0]![0], "empty"); // glass broke
});

test("standing on glass and using staff does not break glass", () => {
  const s = makeState(0, 0, "right", "empty", [
    [0, 0, "glass"],
    [0, 1, "floor"],
  ]);
  const r = applyAction(s, "staff")!;
  assert.equal(r.board[0]![0], "glass"); // glass intact
  assert.equal(r.player.staffContent, "floor");
  assert.equal(r.board[0]![1], "empty");
});

// Staff

test("store floor into empty staff", () => {
  const s = makeState(1, 0, "up", "empty", [
    [0, 0, "floor"],
    [1, 0, "floor"],
  ]);
  const r = applyAction(s, "staff")!;
  assert.equal(r.player.staffContent, "floor");
  assert.equal(r.board[0]![0], "empty");
  assert.equal(r.player.row, 1); // player did not move
});

test("store stairs into empty staff", () => {
  const s = makeState(1, 0, "up", "empty", [
    [0, 0, "stairs"],
    [1, 0, "floor"],
  ]);
  const r = applyAction(s, "staff")!;
  assert.equal(r.player.staffContent, "stairs");
  assert.equal(r.board[0]![0], "empty");
});

test("place floor from staff onto empty cell", () => {
  const s = makeState(1, 0, "up", "floor", [[1, 0, "floor"]]);
  const r = applyAction(s, "staff")!;
  assert.equal(r.board[0]![0], "floor");
  assert.equal(r.player.staffContent, "empty");
});

test("staff full + front occupied returns null", () => {
  const s = makeState(1, 0, "up", "floor", [
    [0, 0, "floor"],
    [1, 0, "floor"],
  ]);
  assert.equal(applyAction(s, "staff"), null);
});

test("staff empty + front empty returns null", () => {
  const s = makeState(1, 0, "up", "empty", [[1, 0, "floor"]]);
  assert.equal(applyAction(s, "staff"), null);
});

test("staff use with front out of bounds returns null", () => {
  const s = makeState(0, 0, "up", "empty", [[0, 0, "floor"]]);
  assert.equal(applyAction(s, "staff"), null);
});

// Combination: glass + movement + staff storage

test("step off glass then store front floor", () => {
  const s0 = makeState(0, 0, "right", "empty", [
    [0, 0, "glass"],
    [0, 1, "floor"],
    [0, 2, "floor"],
  ]);
  // Step 1: move right — glass breaks
  const s1 = applyAction(s0, "right")!;
  assert.equal(s1.board[0]![0], "empty");
  assert.equal(s1.player.col, 1);
  // Step 2: store (0,2) floor
  const s2 = applyAction(s1, "staff")!;
  assert.equal(s2.player.staffContent, "floor");
  assert.equal(s2.board[0]![2], "empty");
  assert.equal(s2.board[0]![0], "empty"); // glass still gone
});
