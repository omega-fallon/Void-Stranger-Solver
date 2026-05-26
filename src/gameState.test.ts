import { test } from "node:test";
import assert from "node:assert/strict";
import { applyAction } from "./gameState";
import { emptyEntityGrid } from "./utils";
import type { Cell, Direction, Entity, GameState, StaffContent } from "./types";

function makeState(
  row: number,
  col: number,
  facing: Direction,
  staffContent: StaffContent,
  cells: Array<[number, number, Cell]> = [],
  entityCells: Array<[number, number, Entity]> = [],
): GameState {
  const board = Array.from({ length: 6 }, () => Array<Cell>(6).fill("empty"));
  for (const [r, c, v] of cells) board[r]![c] = v;
  const entities = emptyEntityGrid();
  for (const [r, c, v] of entityCells) entities[r]![c] = v;
  return { board, entities, player: { row, col, facing, staffContent } };
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

// Wings

function withWings(state: GameState): GameState {
  return { ...state, player: { ...state.player, wingsActive: true } };
}

test("stepping into empty activates wings when hasWings=true", () => {
  // Player on floor, adjacent empty cell ahead
  const s = makeState(1, 0, "up", "empty", [[1, 0, "floor"]]);
  const r = applyAction(s, "up", true)!;
  assert.equal(r.player.row, 0);
  assert.equal(r.player.col, 0);
  assert.equal(r.player.wingsActive, true);
});

test("stepping into empty does not activate wings when hasWings=false", () => {
  const s = makeState(1, 0, "up", "empty", [[1, 0, "floor"]]);
  const r = applyAction(s, "up", false)!;
  assert.equal(r.player.row, 0);
  assert.equal(r.player.wingsActive, false);
});

test("glass breaks when stepping off to fly", () => {
  // Player on glass, steps into empty void — glass breaks, wings activate
  const s = makeState(1, 0, "up", "empty", [[1, 0, "glass"]]);
  const r = applyAction(s, "up", true)!;
  assert.equal(r.player.row, 0);
  assert.equal(r.player.wingsActive, true);
  assert.equal(r.board[1]![0], "empty"); // glass broke on departure
});

test("flying into empty stays airborne", () => {
  // Player already airborne on empty, next cell also empty
  const s = withWings(makeState(2, 0, "up", "empty"));
  const r = applyAction(s, "up", true)!;
  assert.equal(r.player.row, 1);
  assert.equal(r.player.col, 0);
  assert.equal(r.player.wingsActive, true);
});

test("flying onto floor deactivates wings", () => {
  const s = withWings(makeState(2, 0, "up", "empty", [[1, 0, "floor"]]));
  const r = applyAction(s, "up", true)!;
  assert.equal(r.player.row, 1);
  assert.equal(r.player.wingsActive, false);
});

test("flying onto glass deactivates wings; origin empty cell unchanged", () => {
  const s = withWings(makeState(2, 0, "up", "empty", [[1, 0, "glass"]]));
  const r = applyAction(s, "up", true)!;
  assert.equal(r.player.row, 1);
  assert.equal(r.player.wingsActive, false);
  // Origin was empty — nothing to break
  assert.equal(r.board[2]![0], "empty");
  // Destination glass is intact (player hasn't left it yet)
  assert.equal(r.board[1]![0], "glass");
});

test("flying into wall causes fall in place with facing update", () => {
  const s = withWings(makeState(2, 0, "up", "empty", [[1, 0, "wall"]]));
  const r = applyAction(s, "up", true)!;
  // Player stays at (2,0), facing updates, wings off
  assert.equal(r.player.row, 2);
  assert.equal(r.player.col, 0);
  assert.equal(r.player.facing, "up");
  assert.equal(r.player.wingsActive, false);
});

test("flying into stairs is disallowed", () => {
  const s = withWings(makeState(2, 0, "up", "empty", [[1, 0, "stairs"]]));
  const r = applyAction(s, "up", true)!;
  assert.equal(r, null);
});

test("flying into rock entity causes fall in place; rock still moves", () => {
  const s = withWings(
    makeState(
      2,
      0,
      "up",
      "empty",
      [
        [0, 0, "floor"], // landing cell for the pushed rock
        [1, 0, "floor"],
        [2, 0, "floor"],
      ],
      [[1, 0, "rock"]],
    ),
  );
  const r = applyAction(s, "up", true)!;
  assert.equal(r.player.row, 2);
  assert.equal(r.player.col, 0);
  assert.equal(r.player.wingsActive, false);
  assert.equal(r.entities[1]![0], "empty"); // rock vacated its original cell
  assert.equal(r.entities[0]![0], "rock"); // rock pushed to row 0
});

test("flying out of bounds is not allowed", () => {
  const s = withWings(makeState(0, 0, "up", "empty"));
  assert.equal(applyAction(s, "up", true), null);
});

test("staff action preserves wingsActive state", () => {
  // Player airborne, uses staff to pick up a floor tile ahead
  const s = withWings(makeState(2, 0, "up", "empty", [[1, 0, "floor"]]));
  const r = applyAction(s, "staff", true)!;
  assert.equal(r.player.wingsActive, true); // still airborne
  assert.equal(r.player.staffContent, "floor");
  assert.equal(r.board[1]![0], "empty");
});
