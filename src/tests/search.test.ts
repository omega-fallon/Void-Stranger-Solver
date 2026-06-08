import assert from "node:assert/strict";
import { test, type TestContext } from "node:test";
import { replayPath } from "../gameState";
import { heuristic } from "../heuristic";
import { RawLevel } from "../levels";
import { search } from "../search";
import type { Action, Board, Cell } from "../types";
import {
  actionsToString,
  applyPath,
  emptyEntityGrid,
  parseBoard,
  parseEntities,
} from "../utils";

const PATH_CHARS: Record<string, Action> = {
  U: "up",
  D: "down",
  L: "left",
  R: "right",
  Z: "staff",
};

const CELL_CHARS: Record<Cell, string> = {
  empty: " ",
  floor: "#",
  glass: "G",
  stairs: "S",
  wall: "W",
  button: "B",
  trap_inactive: "T",
  trap_active: "A",
};

/** Converts a Board back to the compact string-array notation used in levels.ts. */
export function boardToStrings(board: Board): string[] {
  return board.map((row) => row.map((cell) => CELL_CHARS[cell]).join(""));
}

type TestLevel = Omit<RawLevel, "name"> & {
  name?: string;
  solutionLength?: number;
  requireFinalJump?: boolean;
  hasWings?: boolean;
};

async function runSearchTest(t: TestContext, level: TestLevel) {
  const initial = {
    board: level.initial.board,
    entities: level.initial.entities ?? emptyEntityGrid(),
    player: level.initial.player,
  };
  const target = level.target;
  const requireFinalJump = level.requireFinalJump ?? true;
  const { path } = await search({
    initial,
    target,
    requireFinalJump,
    burdens: { wings: level.hasWings ?? false, sword: false },
  });
  if (process.env.VERBOSE && path)
    replayPath(
      initial,
      path,
      target,
      { wings: level.hasWings ?? false, sword: false },
      requireFinalJump,
    );
  assert.ok(path !== null, "No solution found");
  if (level.solutionLength)
    assert.equal(
      path.length,
      level.solutionLength,
      `Path had length ${path.length} but should have been ${level.solutionLength}`,
    );
  else t.assert.snapshot(path.length);

  // Check heuristic admissibility at every step along the found path,
  // both forwards (from the start) and backwards (from the end).
  const burdens = { wings: level.hasWings ?? false, sword: false };
  const statesOnPath = applyPath(initial, actionsToString(path), burdens);
  // Forward: state at index i has i steps taken, path.length - i remaining.
  for (let i = 0; i < statesOnPath.length; i++) {
    const stepsRemaining = path.length - i;
    const h = heuristic(statesOnPath[i]!, target, requireFinalJump);
    assert.ok(
      h.total <= stepsRemaining,
      `Forward step ${i}/${path.length}: h=${h.total} > ${stepsRemaining} steps remaining. ` +
        `mismatches: ${h.mismatches}, transportCost: ${h.transportCost}, travelCost: ${h.travelCost}`,
    );
  }
  // Backward: same states, iterated from the end to make failure messages clearer.
  for (let i = statesOnPath.length - 1; i >= 0; i--) {
    const stepsRemaining = path.length - i;
    const h = heuristic(statesOnPath[i]!, target, requireFinalJump);
    assert.ok(
      h.total <= stepsRemaining,
      `Backward step ${i}/${path.length}: h=${h.total} > ${stepsRemaining} steps remaining. ` +
        `mismatches: ${h.mismatches}, transportCost: ${h.transportCost}, travelCost: ${h.travelCost}`,
    );
  }
}

async function assertSearchFailure(t: TestContext, level: TestLevel) {
  const initial = {
    board: level.initial.board,
    entities: level.initial.entities ?? emptyEntityGrid(),
    player: level.initial.player,
  };
  const target = level.target;
  const requireFinalJump = level.requireFinalJump ?? true;
  const { path } = await search({
    initial,
    target,
    requireFinalJump,
    burdens: { wings: level.hasWings ?? false, sword: false },
  });
  if (process.env.VERBOSE && path)
    replayPath(
      initial,
      path,
      target,
      { wings: level.hasWings ?? false, sword: false },
      requireFinalJump,
    );
  assert.equal(path, null, "Solution was found, but should not have been");
}

test("Solves Add's brand", async (t) => {
  await runSearchTest(t, {
    initial: {
      // prettier-ignore
      board: parseBoard([
        "#  S #",
        "   ## ",
        " #####",
        "##### ",
        " ##   ",
        "#    #",
      ]),
      player: { row: 3, col: 2, facing: "down", staffContent: "empty" },
    },
    // prettier-ignore
    target: parseBoard([
      "#    #",
      "   ## ",
      " #####",
      "##### ",
      " ##   ",
      "#    #",
    ]),
    solutionLength: 5,
  });
});

test("Walks over glass", async (t) => {
  await runSearchTest(t, {
    initial: {
      // prettier-ignore
      board: parseBoard([
        "#G#   ",
        " ###  ",
        "  S   ",
        "      ",
        "      ",
        "      ",
      ]),
      player: { row: 0, col: 0, facing: "down", staffContent: "empty" },
    },
    // prettier-ignore
    target: parseBoard([
      "# #   ",
      " ###  ",
      "      ",
      "      ",
      "      ",
      "      ",
    ]),
    solutionLength: 5,
  });
});

test("Moves a piece of glass", async (t) => {
  await runSearchTest(t, {
    initial: {
      // prettier-ignore
      board: parseBoard([
        " G#G  ",
        " ###  ",
        "   #  ",
        "   S  ",
        "      ",
        "      ",
      ]),
      player: { row: 0, col: 2, facing: "down", staffContent: "empty" },
    },
    // prettier-ignore
    target: parseBoard([
      "  #   ",
      " ###G ",
      "   #  ",
      "      ",
      "      ",
      "      ",
    ]),
    solutionLength: 9,
  });
});

test("Move a piece of glass to destroy all the glass", async (t) => {
  await runSearchTest(t, {
    initial: {
      // prettier-ignore
      board: parseBoard([
        "      ",
        "GG##GG",
        "  #   ",
        "  S   ",
        "      ",
        "      ",
      ]),
      player: { row: 1, col: 2, facing: "down", staffContent: "empty" },
    },
    // prettier-ignore
    target: parseBoard([
      "      ",
      "  ##  ",
      "  #   ",
      "      ",
      "      ",
      "      ",
    ]),
    solutionLength: 14,
  });
});

test("Fly over a gap", async (t) => {
  await runSearchTest(t, {
    hasWings: true,
    initial: {
      // prettier-ignore
      board: parseBoard([
        "      ",
        " # #S ",
        "      ",
        "      ",
        "      ",
        "      ",
      ]),
      player: { row: 1, col: 1, facing: "down", staffContent: "empty" },
    },
    // prettier-ignore
    target: parseBoard([
      "      ",
      " # #  ",
      "      ",
      "      ",
      "      ",
      "      ",
      "      ",
    ]),
    solutionLength: 4,
  });
});

test("Fly over a gap multiple times", async (t) => {
  await runSearchTest(t, {
    hasWings: true,
    initial: {
      // prettier-ignore
      board: parseBoard([
        "      ",
        " # ## ",
        "  #   ",
        "  S   ",
        "      ",
        "      ",
      ]),
      player: { row: 1, col: 1, facing: "down", staffContent: "empty" },
    },
    // prettier-ignore
    target: parseBoard([
      "      ",
      "## #  ",
      "  #   ",
      "      ",
      "      ",
      "      ",
      "      ",
    ]),
    solutionLength: 10,
  });
});

test("Should not fly over a gap more than 1 wide", async (t) => {
  await assertSearchFailure(t, {
    hasWings: true,
    initial: {
      // prettier-ignore
      board: parseBoard([
        "      ",
        " #  #S",
        "      ",
        "      ",
        "      ",
        "      ",
      ]),
      player: { row: 1, col: 1, facing: "down", staffContent: "empty" },
    },
    // prettier-ignore
    target: parseBoard([
      "      ",
      " #  # ",
      "      ",
      "      ",
      "      ",
      "      ",
      "      ",
    ]),
  });
});

test("Grab a tile while flying", async (t) => {
  await runSearchTest(t, {
    hasWings: true,
    initial: {
      // prettier-ignore
      board: parseBoard([
        "      ",
        " # #  ",
        " S    ",
        "      ",
        "      ",
        "      ",
      ]),
      player: { row: 1, col: 1, facing: "down", staffContent: "empty" },
    },
    // prettier-ignore
    target: parseBoard([
      "      ",
      "##    ",
      "      ",
      "      ",
      "      ",
      "      ",
      "      ",
    ]),
    solutionLength: 8,
  });
});

test("Eus/Eus search correctness regression", async (t) => {
  await runSearchTest(t, {
    initial: {
      // prettier-ignore
      board: parseBoard([
        "GG  GG",
        "  ##  ",
        "GG G G",
        "GGGGGG",
        "GGG GG",
        "GGGSGG",
      ]),
      // prettier-ignore
      entities: parseEntities([
        "      ",
        "      ",
        "      ",
        "      ",
        "      ",
        "     R",
      ]),
      player: {
        row: 2,
        col: 3,
        facing: "left",
        staffContent: "floor",
        wingsActive: false,
      },
    },
    // prettier-ignore
    target: parseBoard([
      "GG  GG",
      "  ##  ",
      "GG   G",
      "GGG GG",
      "GG #GG",
      "GG  GG",
    ]),
    solutionLength: 7,
  });
});
