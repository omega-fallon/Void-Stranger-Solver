import type { PlayerState } from "./types";

export interface RawLevel {
  name: string;
  initial: {
    board: string[];
    /** Entity grid rows. Omit for levels with no entities. " " = empty, "R" = rock */
    entities?: string[];
    player: PlayerState;
  };
  target: string[];
  knownPath?: string;
}

// Board encoding: " " empty  "#" floor  "G" glass  "S" stairs  "W" wall
export const LEVELS: RawLevel[] = [
  {
    name: "Add",
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
    name: "Eus",
    knownPath: "LRURDRZLLZLZRRZRDLZDZDZLDR", // Known to be ideal
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
  // {
  //   name: "Bee",
  //   // Known path: RDZUZUULZRZRLZDLZLLZRRRDZLUZDDLZRRUULRLLRZDRDDZLUUZDRLZUZDLZULZDRUZDZLZLRZURLZDLLRZURLZLRZDLUZDRUZLURZRZR
  //   initial: {
  //     // prettier-ignore
  //     board: [
  //       // TODO
  //     ],
  //     player: { row: 3, col: 3, facing: "down", staffContent: "empty" },
  //   },
  //   // prettier-ignore
  //   target: [
  //     // TODO
  //   ],
  // },
  {
    name: "Mon",
    knownPath:
      "UUZLDDUZUZLRZRZLZDLUZRRLZLZRRZLZRRDUUDZLLRZLDZDDUZLRRLZRDZULLDUZRLZUZDRRRZDZDRDLZUZUDZD",
    initial: {
      // prettier-ignore
      board: [
        "######",
        "#GGGG#",
        "#G#GG#",
        "#GG#G#",
        "#GGGG#",
        "######",
      ],
      // prettier-ignore
      entities: [
        "     R",
        "      ",
        "      ",
        "      ",
        "    R ",
        "R     ",
      ],
      player: { row: 3, col: 3, facing: "down", staffContent: "empty" },
    },
    // prettier-ignore
    target: [
      "#   ##",
      " ### #",
      "##  ##",
      " ### #",
      "#   ##",
      "###   "
    ],
  },
];
