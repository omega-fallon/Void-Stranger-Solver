import assert from "node:assert/strict";
import { test, type TestContext } from "node:test";
import { applyAction, replayPath } from "../gameState";
import { search } from "../search";
import type {
  Action,
  Board,
  Cell,
  EntityGrid,
  GameState,
  PlayerState,
} from "../types";
import { emptyEntityGrid, parseBoard, parseEntities } from "../utils";
import { RawLevel } from "../levels";

const PATH_CHARS: Record<string, Action> = {
  U: "up",
  D: "down",
  L: "left",
  R: "right",
  Z: "staff",
};

/**
 * Applies a compact path string to an initial board state and returns the
 * resulting GameState after each step.
 *
 * Path characters: U=up  D=down  L=left  R=right  Z=staff (use staff)
 *
 * Throws if a character is unrecognised or the resulting action is invalid
 * (e.g. moving into a wall), so call-site mistakes surface immediately.
 */
export function applyPath(
  initial: { board: string[]; player: PlayerState; entities: EntityGrid },
  pathStr: string,
): GameState[] {
  const states: GameState[] = [];
  let state: GameState = {
    board: parseBoard(initial.board),
    player: initial.player,
    entities: initial.entities,
  };

  for (let i = 0; i < pathStr.length; i++) {
    const char = pathStr[i]!;
    const action = PATH_CHARS[char];
    if (!action)
      throw new Error(`Unknown path character "${char}" at index ${i}`);
    const next = applyAction(state, action);
    if (!next)
      throw new Error(
        `Invalid action "${action}" (${char}) at step ${i + 1} — move blocked`,
      );
    states.push(next);
    state = next;
  }

  return states;
}

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
    board: parseBoard(level.initial.board),
    entities: level.initial.entities
      ? parseEntities(level.initial.entities)
      : emptyEntityGrid(),
    player: level.initial.player,
  };
  const target = parseBoard(level.target);
  const requireFinalJump = level.requireFinalJump ?? true;
  const { path } = await search({
    initial,
    target,
    requireFinalJump,
    hasWings: level.hasWings ?? false,
  });
  if (process.env.VERBOSE && path)
    replayPath(initial, path, target, requireFinalJump);
  assert.ok(path !== null, "No solution found");
  if (level.solutionLength)
    assert.equal(
      path.length,
      level.solutionLength,
      `Path had length ${path.length} but should have been ${level.solutionLength}`,
    );
  else t.assert.snapshot(path.length);
}

test("Solves Add's brand", async (t) => {
  await runSearchTest(t, {
    initial: {
      // prettier-ignore
      board: [
        "#  S #",
        "   ## ",
        " #####",
        "##### ",
        " ##   ",
        "#    #",
      ],
      player: { row: 3, col: 2, facing: "down", staffContent: "empty" },
    },
    // prettier-ignore
    target: [
      "#    #",
      "   ## ",
      " #####",
      "##### ",
      " ##   ",
      "#    #",
    ],
    solutionLength: 5,
  });
});

test("Walks over glass", async (t) => {
  await runSearchTest(t, {
    initial: {
      // prettier-ignore
      board: [
        "#G#   ",
        " ###  ",
        "  S   ",
        "      ",
        "      ",
        "      ",
      ],
      player: { row: 0, col: 0, facing: "down", staffContent: "empty" },
    },
    // prettier-ignore
    target: [
      "# #   ",
      " ###  ",
      "      ",
      "      ",
      "      ",
      "      ",
    ],
    solutionLength: 5,
  });
});

test("Moves a piece of glass", async (t) => {
  await runSearchTest(t, {
    initial: {
      // prettier-ignore
      board: [
        " G#G  ",
        " ###  ",
        "   #  ",
        "   S  ",
        "      ",
        "      ",
      ],
      player: { row: 0, col: 2, facing: "down", staffContent: "empty" },
    },
    // prettier-ignore
    target: [
      "  #   ",
      " ###G ",
      "   #  ",
      "      ",
      "      ",
      "      ",
    ],
    solutionLength: 9,
  });
});

test("Move a piece of glass to destroy all the glass", async (t) => {
  await runSearchTest(t, {
    initial: {
      // prettier-ignore
      board: [
        "      ",
        "GG##GG",
        "  #   ",
        "  S   ",
        "      ",
        "      ",
      ],
      player: { row: 1, col: 2, facing: "down", staffContent: "empty" },
    },
    // prettier-ignore
    target: [
      "      ",
      "  ##  ",
      "  #   ",
      "      ",
      "      ",
      "      ",
    ],
    solutionLength: 14,
  });
});

test("Fly over a gap", async (t) => {
  await runSearchTest(t, {
    hasWings: true,
    initial: {
      // prettier-ignore
      board: [
        "      ",
        " # #S ",
        "      ",
        "      ",
        "      ",
        "      ",
      ],
      player: { row: 1, col: 1, facing: "down", staffContent: "empty" },
    },
    // prettier-ignore
    target: [
      "      ",
      " # #  ",
      "      ",
      "      ",
      "      ",
      "      ",
      "      ",
    ],
    solutionLength: 4,
  });
});

test("Fly over a gap multiple times", async (t) => {
  await runSearchTest(t, {
    hasWings: true,
    initial: {
      // prettier-ignore
      board: [
        "      ",
        " # ## ",
        "  #   ",
        "  S   ",
        "      ",
        "      ",
      ],
      player: { row: 1, col: 1, facing: "down", staffContent: "empty" },
    },
    // prettier-ignore
    target: [
      "      ",
      "## #  ",
      "  #   ",
      "      ",
      "      ",
      "      ",
      "      ",
    ],
    solutionLength: 10,
  });
});

test("Grab a tile while flying", async (t) => {
  await runSearchTest(t, {
    hasWings: true,
    initial: {
      // prettier-ignore
      board: [
        "      ",
        " # #  ",
        " S    ",
        "      ",
        "      ",
        "      ",
      ],
      player: { row: 1, col: 1, facing: "down", staffContent: "empty" },
    },
    // prettier-ignore
    target: [
      "      ",
      "##    ",
      "      ",
      "      ",
      "      ",
      "      ",
      "      ",
    ],
    solutionLength: 8,
  });
});

test("Eus/Eus search correctness regression", async (t) => {
  await runSearchTest(t, {
    initial: {
      // prettier-ignore
      board: [
        "GG  GG",
        "  ##  ",
        "GG G G",
        "GGGGGG",
        "GGG GG",
        "GGGSGG",
      ],
      // prettier-ignore
      entities: [
        "      ",
        "      ",
        "      ",
        "      ",
        "      ",
        "     R",
      ],
      player: {
        row: 2,
        col: 3,
        facing: "left",
        staffContent: "floor",
        wingsActive: false,
      },
    },
    // prettier-ignore
    target: [
      "GG  GG",
      "  ##  ",
      "GG   G",
      "GGG GG",
      "GG #GG",
      "GG  GG",
    ],
    solutionLength: 7,
  });
});
