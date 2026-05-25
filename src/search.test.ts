import { test } from "node:test";
import assert from "node:assert/strict";
import { aStar } from "./search";
import { applyAction, replayPath } from "./gameState";
import { parseBoard } from "./solve";
import type { RawLevel } from "./levels";
import type { Action, Board, Cell, GameState, PlayerState } from "./types";

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
  initial: { board: string[]; player: PlayerState },
  pathStr: string,
): GameState[] {
  const states: GameState[] = [];
  let state: GameState = {
    board: parseBoard(initial.board),
    player: initial.player,
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
};

/** Converts a Board back to the compact string-array notation used in levels.ts. */
export function boardToStrings(board: Board): string[] {
  return board.map((row) => row.map((cell) => CELL_CHARS[cell]).join(""));
}

const TEST_LEVELS: (RawLevel & { solutionLength?: number })[] = [
  {
    name: "Solves Add's brand",
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
  },
  {
    name: "Walks over glass",
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
  },
  {
    name: "Moves a piece of glass",
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
  },
  {
    name: "Move a piece of glass",
    // Real full solution is LRURDRZLLZLZRRZRDLZDZDZLDR
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
    // solutionLength: 5,
  },
  // {
  //   name: "First few moves of Eus",
  //   // Real full solution is LRURDRZLLZLZRRZRDLZDZDZLDR
  //   initial: {
  //     // prettier-ignore
  //     board: [
  //       "GGGGGG",
  //       "GG##GG",
  //       "GG#GGG",
  //       "GGGGGG",
  //       "GGG GG",
  //       "GGG GW",
  //     ],
  //     player: { row: 1, col: 2, facing: "down", staffContent: "empty" },
  //   },
  //   // prettier-ignore
  //   target: [
  //     "GG  GG",
  //     "  ##G ",
  //     "GG  GG",
  //     "GGG GG",
  //     "GGG#GG",
  //     "GGG GW",
  //   ],
  //   // solutionLength: 5,
  // },
  // Eus last step
  {
    name: "Eus final step",
    initial: {
      // prettier-ignore
      board: [
        'GG  GG',
        '  ##  ',
        'GG   G',
        'GGG GG',
        'GG #GG',
        'GGG GW' 
      ],
      player: { row: 5, col: 2, facing: "down", staffContent: "stairs" },
    },
    // prettier-ignore
    target: [
      'GG  GG',
      '  ##  ',
      'GG   G',
      'GGG GG',
      'GG #GG',
      'GG  GW' 
    ],
  },
];

for (const level of TEST_LEVELS) {
  test(`${level.name}`, async () => {
    const initial = {
      board: parseBoard(level.initial.board),
      player: level.initial.player,
    };
    const target = parseBoard(level.target);
    const { path } = await aStar(initial, target);
    if (level.solutionLength) {
      assert.equal(level.solutionLength, path?.length);
    }
    if (path) replayPath(initial, path, target);
    assert.ok(path !== null, "No solution found");
  });
}
//
// const states = applyPath(
//   {
//     // prettier-ignore
//     board: [
//       "GGGGGG",
//       "GG##GG",
//       "GG#GGG",
//       "GGGGGG",
//       "GGG GG",
//       "GGGSGW"
//     ],
//     player: { row: 1, col: 2, facing: "down", staffContent: "empty" },
//   },
//   "LRURDRZLLZLZRRZRDLZDZDZLDR",
// );
// console.dir(
//   states.map((state) => ({ ...state, board: boardToStrings(state.board) })),
//   { depth: null },
// );
