import type { PlayerState } from "./types";

export interface RawLevel {
  name: string;
  initial: {
    board: string[];
    player: PlayerState;
  };
  target: string[];
}

// Board encoding: " " empty  "#" floor  "G" glass  "S" stairs
export const LEVELS: RawLevel[] = [
  {
    name: "Add",
    initial: {
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
    name: "Eus",
    initial: {
      board: [
        "GGGGGG",
        "GG##GG",
        "GG#GGG",
        "GGGGGG",
        "GGG GG",
        "GGGSGW",
      ],
      player: { row: 2, col: 3, facing: "down", staffContent: "empty" },
    },
    target: [
      "GG  GG",
      "  ##  ",
      "GG   G",
      "GG# GG",
      "GG GGG",
      "GG  GW",
    ],
  },
];
