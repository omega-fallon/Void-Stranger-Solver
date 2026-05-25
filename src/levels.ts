import type { PlayerState } from "./types";

export interface RawLevel {
  name: string;
  initial: {
    board: string[];
    player: PlayerState;
  };
  target: string[];
}

// Board encoding: " " empty  "#" floor  "G" glass  "S" stairs  "W" wall  "B" button  "T" inactive trap  "A" active trap
export const LEVELS: RawLevel[] = [
  {
    name: "Add+Add",
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
    name: "Eus+Eus",
    initial: {
      // prettier-ignore
      board: [
        "GGGGGG",
        "GG##GG",
        "GG#GGG",
        "GGGGGG",
        "GGG GG",
        "GGGSGW",
      ],
      player: { row: 1, col: 2, facing: "down", staffContent: "empty" },
    },
    // prettier-ignore
    target: [
      "GG  GG",
      "  ##  ",
      "GG   G",
      "GG# GG",
      "GG GGG",
      "GG  GW",
    ],
  },
  {
    name: "Eus+Add",
    initial: {
      // prettier-ignore
      board: [
        "GGGGGG",
        "GG##GG",
        "GG#GGG",
        "GGGGGG",
        "GGG GG",
        "GGGSGW",
      ],
      player: { row: 1, col: 2, facing: "down", staffContent: "empty" },
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
];
