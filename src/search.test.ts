import { test } from "node:test";
import assert from "node:assert/strict";
import { aStar } from "./search";
import { parseBoard } from "./solve";
import type { RawLevel } from "./levels";

const TEST_LEVELS: RawLevel[] = [
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
];

for (const level of TEST_LEVELS) {
  test(`${level.name}`, async () => {
    const initial = {
      board: parseBoard(level.initial.board),
      player: level.initial.player,
    };
    const target = parseBoard(level.target);
    const { path } = await aStar(initial, target, true);
    assert.ok(path !== null, "No solution found");
  });
}
