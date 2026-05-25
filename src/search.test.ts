import { test } from "node:test";
import assert from "node:assert/strict";
import { search } from "./search";
import { replayPath } from "./gameState";
import { emptyEntityGrid, parseBoard, parseEntities } from "./utils";
import type { RawLevel } from "./levels";

const TEST_LEVELS: (RawLevel & {
  solutionLength?: number;
  requireFinalJump?: boolean;
})[] = [
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
      entities: level.initial.entities
        ? parseEntities(level.initial.entities)
        : emptyEntityGrid(),
      player: level.initial.player,
    };
    const target = parseBoard(level.target);
    const requireFinalJump = level.requireFinalJump ?? true;
    const { path } = await search(
      initial,
      target,
      false,
      false,
      requireFinalJump,
    );
    if (level.solutionLength) {
      assert.equal(level.solutionLength, path?.length);
    }
    if (path) replayPath(initial, path, target, requireFinalJump);
    assert.ok(path !== null, "No solution found");
  });
}
