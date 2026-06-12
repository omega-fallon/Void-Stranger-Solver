import { test } from "node:test";
import assert from "node:assert/strict";
import { applyAction, renderState, replayPath } from "../gameState";
import { emptyEntityGrid } from "../utils";
import {
  NO_BURDENS,
  type Cell,
  type Direction,
  type Entity,
  type GameState,
  type StaffContent,
} from "../types";

function makeState(
  row: number,
  col: number,
  facing: Direction,
  staffContent: StaffContent[],
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
  const s = makeState(
    1,
    0,
    "down",
    [],
    [
      [0, 0, "floor"],
      [1, 0, "floor"],
    ],
  );
  const r = applyAction(s, "up", NO_BURDENS)!;
  assert.equal(r.player.row, 0);
  assert.equal(r.player.col, 0);
  assert.equal(r.player.facing, "up");
  assert.equal(r.board[1]![0], "floor"); // origin cell unchanged
});

test("move into empty moves player there (exit step)", () => {
  const s = makeState(1, 0, "down", [], [[1, 0, "floor"]]);
  const r = applyAction(s, "up", NO_BURDENS)!;
  assert.equal(r.player.row, 0);
  assert.equal(r.player.col, 0);
  assert.equal(r.board[0]![0], "empty"); // destination cell stays empty
});

test("move out of bounds returns null", () => {
  const s = makeState(0, 0, "up", [], [[0, 0, "floor"]]);
  assert.equal(applyAction(s, "up", NO_BURDENS), null);
});

test("move onto stairs returns null (stairs is not walkable)", () => {
  const s = makeState(
    1,
    0,
    "down",
    [],
    [
      [0, 0, "stairs"],
      [1, 0, "floor"],
    ],
  );
  assert.equal(applyAction(s, "up", NO_BURDENS), null);
});

// Glass

test("stepping off glass breaks it", () => {
  const s = makeState(
    0,
    0,
    "right",
    [],
    [
      [0, 0, "glass"],
      [0, 1, "floor"],
    ],
  );
  const r = applyAction(s, "right", NO_BURDENS)!;
  assert.equal(r.player.col, 1);
  assert.equal(r.board[0]![0], "empty"); // glass broke
});

test("standing on glass and using staff does not break glass", () => {
  const s = makeState(
    0,
    0,
    "right",
    [],
    [
      [0, 0, "glass"],
      [0, 1, "floor"],
    ],
  );
  const r = applyAction(s, "staff", NO_BURDENS)!;
  assert.equal(r.board[0]![0], "glass"); // glass intact
  assert.equal(r.player.staffContent, "floor");
  assert.equal(r.board[0]![1], "empty");
});

// Staff

test("store floor into empty staff", () => {
  const s = makeState(
    1,
    0,
    "up",
    [],
    [
      [0, 0, "floor"],
      [1, 0, "floor"],
    ],
  );
  const r = applyAction(s, "staff", NO_BURDENS)!;
  assert.equal(r.player.staffContent, "floor");
  assert.equal(r.board[0]![0], "empty");
  assert.equal(r.player.row, 1); // player did not move
});

test("store stairs into empty staff", () => {
  const s = makeState(
    1,
    0,
    "up",
    [],
    [
      [0, 0, "stairs"],
      [1, 0, "floor"],
    ],
  );
  const r = applyAction(s, "staff", NO_BURDENS)!;
  assert.equal(r.player.staffContent, "stairs");
  assert.equal(r.board[0]![0], "empty");
});

test("place floor from staff onto empty cell", () => {
  const s = makeState(1, 0, "up", ["floor"], [[1, 0, "floor"]]);
  const r = applyAction(s, "staff", NO_BURDENS)!;
  assert.equal(r.board[0]![0], "floor");
  assert.equal(r.player.staffContent, "empty");
});

test("staff full + front occupied returns null", () => {
  const s = makeState(
    1,
    0,
    "up",
    ["floor"],
    [
      [0, 0, "floor"],
      [1, 0, "floor"],
    ],
  );
  assert.equal(applyAction(s, "staff", NO_BURDENS), null);
});

test("staff empty + front empty returns null", () => {
  const s = makeState(1, 0, "up", [], [[1, 0, "floor"]]);
  assert.equal(applyAction(s, "staff", NO_BURDENS), null);
});

test("staff use with front out of bounds returns null", () => {
  const s = makeState(0, 0, "up", [], [[0, 0, "floor"]]);
  assert.equal(applyAction(s, "staff", NO_BURDENS), null);
});

// Combination: glass + movement + staff storage

test("step off glass then store front floor", () => {
  const s0 = makeState(
    0,
    0,
    "right",
    [],
    [
      [0, 0, "glass"],
      [0, 1, "floor"],
      [0, 2, "floor"],
    ],
  );
  // Step 1: move right — glass breaks
  const s1 = applyAction(s0, "right", NO_BURDENS)!;
  assert.equal(s1.board[0]![0], "empty");
  assert.equal(s1.player.col, 1);
  // Step 2: store (0,2) floor
  const s2 = applyAction(s1, "staff", NO_BURDENS)!;
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
  const s = makeState(1, 0, "up", [], [[1, 0, "floor"]]);
  const r = applyAction(s, "up", {
    wings: true,
    sword: false,
    endless: false,
  })!;
  assert.equal(r.player.row, 0);
  assert.equal(r.player.col, 0);
  assert.equal(r.player.wingsActive, true);
});

test("stepping into empty does not activate wings when hasWings=false", () => {
  const s = makeState(1, 0, "up", [], [[1, 0, "floor"]]);
  const r = applyAction(s, "up", {
    wings: false,
    sword: false,
    endless: false,
  })!;
  assert.equal(r.player.row, 0);
  assert.equal(r.player.wingsActive, false);
});

test("glass breaks when stepping off to fly", () => {
  // Player on glass, steps into empty void — glass breaks, wings activate
  const s = makeState(1, 0, "up", [], [[1, 0, "glass"]]);
  const r = applyAction(s, "up", {
    wings: true,
    sword: false,
    endless: false,
  })!;
  assert.equal(r.player.row, 0);
  assert.equal(r.player.wingsActive, true);
  assert.equal(r.board[1]![0], "empty"); // glass broke on departure
});

test("flying from empty to empty loses wings (and you fall)", () => {
  // Player already airborne on empty, next cell also empty
  const s = withWings(makeState(2, 0, "up", []));
  const r = applyAction(s, "up", {
    wings: true,
    sword: false,
    endless: false,
  })!;
  assert.equal(r.player.row, 1);
  assert.equal(r.player.col, 0);
  assert.equal(r.player.wingsActive, false);
});

test("flying onto floor deactivates wings", () => {
  const s = withWings(makeState(2, 0, "up", [], [[1, 0, "floor"]]));
  const r = applyAction(s, "up", {
    wings: true,
    sword: false,
    endless: false,
  })!;
  assert.equal(r.player.row, 1);
  assert.equal(r.player.wingsActive, false);
});

test("flying onto glass deactivates wings; origin empty cell unchanged", () => {
  const s = withWings(makeState(2, 0, "up", [], [[1, 0, "glass"]]));
  const r = applyAction(s, "up", {
    wings: true,
    sword: false,
    endless: false,
  })!;
  assert.equal(r.player.row, 1);
  assert.equal(r.player.wingsActive, false);
  // Origin was empty — nothing to break
  assert.equal(r.board[2]![0], "empty");
  // Destination glass is intact (player hasn't left it yet)
  assert.equal(r.board[1]![0], "glass");
});

test("flying into wall causes fall in place with facing update", () => {
  const s = withWings(makeState(2, 0, "up", [], [[1, 0, "wall"]]));
  const r = applyAction(s, "up", {
    wings: true,
    sword: false,
    endless: false,
  })!;
  // Player stays at (2,0), facing updates, wings off
  assert.equal(r.player.row, 2);
  assert.equal(r.player.col, 0);
  assert.equal(r.player.facing, "up");
  assert.equal(r.player.wingsActive, false);
});

test("flying into stairs is disallowed", () => {
  const s = withWings(makeState(2, 0, "up", [], [[1, 0, "stairs"]]));
  const r = applyAction(s, "up", {
    wings: true,
    sword: false,
    endless: false,
  })!;
  assert.equal(r, null);
});

test("flying into rock entity causes fall in place; rock still moves", () => {
  const s = withWings(
    makeState(
      2,
      0,
      "up",
      [],
      [
        [0, 0, "floor"], // landing cell for the pushed rock
        [1, 0, "floor"],
        [2, 0, "floor"],
      ],
      [[1, 0, "rock"]],
    ),
  );
  const r = applyAction(s, "up", {
    wings: true,
    sword: false,
    endless: false,
  })!;
  assert.equal(r.player.row, 2);
  assert.equal(r.player.col, 0);
  assert.equal(r.player.wingsActive, false);
  assert.equal(r.entities[1]![0], "empty"); // rock vacated its original cell
  assert.equal(r.entities[0]![0], "rock"); // rock pushed to row 0
});

test("flying out of bounds makes you fall", () => {
  const s = withWings(makeState(0, 0, "up", []));
  const r = applyAction(s, "up", {
    wings: true,
    sword: false,
    endless: false,
  })!;
  assert.equal(r.player.row, 0);
  assert.equal(r.player.col, 0);
  assert.equal(r.player.wingsActive, false);
});

test("staff action preserves wingsActive state", () => {
  // Player airborne, uses staff to pick up a floor tile ahead
  const s = withWings(makeState(2, 0, "up", [], [[1, 0, "floor"]]));
  const r = applyAction(s, "staff", {
    wings: true,
    sword: false,
    endless: false,
  })!;
  assert.equal(r.player.wingsActive, true); // still airborne
  assert.equal(r.player.staffContent, "floor");
  assert.equal(r.board[1]![0], "empty");
});

// Ground rock-push (lines 162-187) — no wings

test("ground push rock succeeds: rock moves one step, player stays in place", () => {
  const s = makeState(
    2,
    0,
    "down",
    [],
    [
      [0, 0, "floor"],
      [1, 0, "floor"],
      [2, 0, "floor"],
    ],
    [[1, 0, "rock"]],
  );
  const r = applyAction(s, "up", NO_BURDENS)!;
  assert.equal(r.player.row, 2); // player did NOT advance
  assert.equal(r.player.col, 0);
  assert.equal(r.player.facing, "up"); // facing updated
  assert.equal(r.entities[1]![0], "empty"); // rock left its cell
  assert.equal(r.entities[0]![0], "rock"); // rock arrived at destination
});

test("ground push rock out of bounds returns null", () => {
  // Rock at row 0 — pushing up would send it to row -1
  const s = makeState(
    1,
    0,
    "up",
    [],
    [
      [0, 0, "floor"],
      [1, 0, "floor"],
    ],
    [[0, 0, "rock"]],
  );
  assert.equal(applyAction(s, "up", NO_BURDENS), null);
});

test("ground push rock into wall returns null", () => {
  const s = makeState(
    2,
    0,
    "up",
    [],
    [
      [0, 0, "wall"],
      [1, 0, "floor"],
      [2, 0, "floor"],
    ],
    [[1, 0, "rock"]],
  );
  assert.equal(applyAction(s, "up", NO_BURDENS), null);
});

test("ground push rock into another rock returns null", () => {
  const s = makeState(
    2,
    0,
    "up",
    [],
    [
      [0, 0, "floor"],
      [1, 0, "floor"],
      [2, 0, "floor"],
    ],
    [
      [0, 0, "rock"],
      [1, 0, "rock"],
    ],
  );
  assert.equal(applyAction(s, "up", NO_BURDENS), null);
});

test("ground push rock off glass: glass at rock origin breaks", () => {
  const s = makeState(
    2,
    0,
    "up",
    [],
    [
      [0, 0, "floor"],
      [1, 0, "glass"],
      [2, 0, "floor"],
    ],
    [[1, 0, "rock"]],
  );
  const r = applyAction(s, "up", NO_BURDENS)!;
  assert.equal(r.board[1]![0], "empty"); // glass broke where rock stood
  assert.equal(r.entities[1]![0], "empty"); // rock vacated
  assert.equal(r.entities[0]![0], "rock"); // rock arrived at floor
  assert.equal(r.player.row, 2); // player stayed
});

test("ground push rock into void: rock disappears", () => {
  // (0,0) is empty (void) — the rock falls in and is removed
  const s = makeState(
    2,
    0,
    "up",
    [],
    [
      [1, 0, "floor"],
      [2, 0, "floor"],
    ], // row 0 left as empty/void
    [[1, 0, "rock"]],
  );
  const r = applyAction(s, "up", NO_BURDENS)!;
  assert.equal(r.entities[0]![0], "empty"); // rock gone into void
  assert.equal(r.entities[1]![0], "empty"); // original spot also clear
  assert.equal(r.player.row, 2); // player stayed
});

// renderBoard (lines 325-386)

test("renderBoard returns a string with top and bottom borders", () => {
  const s = makeState(0, 0, "right", []);
  const result = renderState(s);
  assert.equal(typeof result, "string");
  assert.ok(result.includes("┌────────────┐"));
  assert.ok(result.includes("└────────────┘"));
  assert.ok(result.includes("│"));
});

test("renderBoard shows correct player arrow for each facing direction", () => {
  const cases: Array<[Direction, string]> = [
    ["up", "⇑"],
    ["down", "⇓"],
    ["left", "⇐"],
    ["right", "⇒"],
  ];
  for (const [dir, arrow] of cases) {
    const s = makeState(0, 0, dir, []);
    assert.ok(
      renderState(s).includes(arrow),
      `Expected arrow "${arrow}" for direction "${dir}"`,
    );
  }
});

test("renderBoard shows floor tile as solid block chars", () => {
  // Player at (5,5), floor at (1,1) — no overlay conflict
  const s = makeState(5, 5, "right", [], [[1, 1, "floor"]]);
  assert.ok(renderState(s).includes("██"));
});

test("renderBoard shows glass tile as light-shade chars", () => {
  const s = makeState(5, 5, "right", [], [[1, 1, "glass"]]);
  assert.ok(renderState(s).includes("░░"));
});

test("renderBoard shows wall tile", () => {
  const s = makeState(5, 5, "right", [], [[1, 1, "wall"]]);
  assert.ok(renderState(s).includes("▓▓"));
});

test("renderBoard shows stairs tile", () => {
  const s = makeState(5, 5, "right", [], [[1, 1, "stairs"]]);
  assert.ok(renderState(s).includes("S "));
});

test("renderBoard shows button tile", () => {
  const s = makeState(5, 5, "right", [], [[1, 1, "button"]]);
  assert.ok(renderState(s).includes("█B"));
});

test("renderBoard shows trap_inactive tile", () => {
  const s = makeState(5, 5, "right", [], [[1, 1, "trap_inactive"]]);
  assert.ok(renderState(s).includes("◖◗"));
});

test("renderBoard shows trap_active tile", () => {
  const s = makeState(5, 5, "right", [], [[1, 1, "trap_active"]]);
  assert.ok(renderState(s).includes("<>"));
});

test("renderBoard shows rock entity as R", () => {
  const s = makeState(5, 5, "right", [], [[1, 1, "floor"]], [[1, 1, "rock"]]);
  assert.ok(renderState(s).includes("R"));
});

test("renderBoard shows wings indicator when player is airborne", () => {
  const s = withWings(makeState(0, 0, "right", []));
  assert.ok(renderState(s).includes("🦋"));
});

test("renderBoard omits wings indicator when player is grounded", () => {
  const s = makeState(0, 0, "right", []);
  assert.ok(!renderState(s).includes("🦋"));
});

test("renderBoard first line reports floor tile count (floor + glass combined)", () => {
  const s = makeState(
    5,
    5,
    "right",
    [],
    [
      [0, 0, "floor"],
      [0, 1, "glass"],
      [0, 2, "floor"],
    ],
  );
  const firstLine = renderState(s).split("\n")[0]!;
  assert.ok(
    firstLine.startsWith("3 floor tiles remain"),
    `Got: "${firstLine}"`,
  );
});

test("renderBoard counts floor tile held in staff toward total", () => {
  const s = makeState(5, 5, "right", ["floor"], [[0, 0, "floor"]]);
  const firstLine = renderState(s).split("\n")[0]!;
  assert.ok(
    firstLine.startsWith("2 floor tiles remain"),
    `Got: "${firstLine}"`,
  );
});

test("renderBoard counts glass tile held in staff toward total", () => {
  const s = makeState(5, 5, "right", ["glass"], [[0, 0, "floor"]]);
  const firstLine = renderState(s).split("\n")[0]!;
  assert.ok(
    firstLine.startsWith("2 floor tiles remain"),
    `Got: "${firstLine}"`,
  );
});

test("renderBoard shows requiredTiles in first line when provided", () => {
  const s = makeState(0, 0, "right", [], [[1, 0, "floor"]]);
  assert.ok(renderState(s, 10).includes("out of a necessary 10"));
});

test("renderBoard omits requiredTiles phrase when not provided", () => {
  const s = makeState(0, 0, "right", []);
  assert.ok(!renderState(s).includes("out of a necessary"));
});

// replayPath (lines 301-323)

test("replayPath with empty path does not throw", () => {
  const initial = makeState(
    1,
    0,
    "up",
    [],
    [
      [0, 0, "floor"],
      [1, 0, "floor"],
    ],
  );
  assert.doesNotThrow(() => replayPath(initial, [], initial.board));
});

test("replayPath with one valid step does not throw", () => {
  // Player at (1,0) facing up, moves to floor at (0,0)
  const initial = makeState(
    1,
    0,
    "up",
    [],
    [
      [0, 0, "floor"],
      [1, 0, "floor"],
    ],
  );
  assert.doesNotThrow(() => replayPath(initial, ["up"], initial.board));
});
