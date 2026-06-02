import type { PlayerState } from "./types";

/** A level pairing an initial brane state with a target brand board. */
export interface RawLevel {
  name: string;
  initial: {
    board: string[];
    entities?: string[];
    player: PlayerState;
  };
  target: string[];
  requireFinalJump?: boolean;
}

export interface RawBraneInitial {
  name: string;
  board: string[];
  entities: string[];
  player: PlayerState;
  knownPath?: string;
}

export interface RawBrand {
  name: string;
  board: string[];
}

// Board encoding: " " empty  "#" floor  "G" glass  "S" stairs  "W" wall  "B" button  "T" inactive trap  "A" active trap
export const BRANES: RawBraneInitial[] = [
  {
    name: "Add",
    // prettier-ignore
    board: [
      "#  S #",
      "   ## ",
      " #####",
      "##### ",
      " ##   ",
      "#    #",
    ],
    // prettier-ignore
    entities: [
      "      ",
      "      ",
      "      ",
      "      ",
      "      ",
      "      ",
    ],
    player: { row: 3, col: 2, facing: "down", staffContent: "empty" },
  },
  {
    name: "Eus",
    // prettier-ignore
    board: [
      "GGGGGG",
      "GG##GG",
      "GG#GGG",
      "GGGGGG",
      "GGG GG",
      "GGGSG#",
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
    player: { row: 1, col: 2, facing: "down", staffContent: "empty" },
  },
  //{
  //  name: "Bee",
  //  // prettier-ignore
  //  board: [
  //    "  ### ",
  //    " ## ##",
  //    " #   #",
  //    " S ## ",
  //    "#   ##",
  //    "##### ",
  //  ],
  //  // prettier-ignore
  //  entities: [
  //    "      ",
  //    "      ",
  //    "      ",
  //    " B    ",
  //    "      ",
  //    "R     ",
  //  ],
  //  player: { row: 3, col: 3, facing: "down", staffContent: "empty" },
  //},
  {
    name: "Mon",
    // prettier-ignore
    board: [
      "B#####",
      "#GGGG#",
      "#G#GG#",
      "#GG#G#",
      "#GGGG#",
      "#####S",
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
  {
    name: "Tan",
    // prettier-ignore
    board: [
      "#G##G#",
      "GG##GG",
      "#G##G#",
      "##SG##",
      "#G##G#",
      "##GG##",
    ],
    // prettier-ignore
    entities: [
      "~H  H~",
      "HH  HH",
      "~H~~H~",
      "   H  ",
      " H~ H ",
      "  HH  ",
    ],
    player: { row: 0, col: 2, facing: "down", staffContent: "empty" },
  },
  {
    name: "Gor",
    // prettier-ignore
    board: [
      "GG##GG",
      "GG##GG",
      "GGGGG#",
      "#GGGG#",
      "GG##GG",
      "WG##GS",
    ],
    // prettier-ignore
    entities: [
      "M     ",
      "      ",
      "      ",
      "     R",
      "      ",
      "R     ",
    ],
    player: { row: 0, col: 5, facing: "down", staffContent: "empty" },
  },
  {
    name: "Lev",
    // prettier-ignore
    board: [
      "#TTS##",
      "TT####",
      "#TT#TT",
      "TT##TT",
      "TTTTT#",
      "##TT##",
    ],
    // prettier-ignore
    entities: [
      "C     ",
      "      ",
      "   W  ",
      "      ",
      "      ",
      "W     ",
    ],
    player: { row: 0, col: 5, facing: "down", staffContent: "empty" },
  },
  {
    name: "Lev-glass",
    // prettier-ignore
    board: [
      "#GGS##",
      "GG####",
      "#GG#GG",
      "GG##GG",
      "GGGGG#",
      "##GG##",
    ],
    // prettier-ignore
    entities: [
      "C     ",
      "      ",
      "   W  ",
      "      ",
      "      ",
      "W     ",
    ],
    player: { row: 0, col: 5, facing: "down", staffContent: "empty" },
  },
  {
    name: "Cif",
    // prettier-ignore
    board: [
      "W#   W",
      " # # #",
      " #  # ",
      "# #   ",
      "#  #  ",
      "W# S W",
    ],
    // prettier-ignore
    entities: [
      "      ",
      "      ",
      "      ",
      "      ",
      "      ",
      "      ",
    ],
    player: { row: 4, col: 3, facing: "down", staffContent: "empty" },
  },
];

export const BRANDS: RawBrand[] = [
  {
    name: "Add",
    // prettier-ignore
    board: [
      "#    #",
      "   ## ",
      " #####",
      "##### ",
      " ##   ",
      "#    #"
    ],
  },
  {
    name: "Eus",
    // prettier-ignore
    board: [
      "##  ##",
      "  ##  ",
      "##   #",
      "### ##",
      "## ###",
      "##  ##"
    ],
  },
  {
    name: "Bee",
    // prettier-ignore
    board: [
      "     #",
      "  ##  ",
      "###  #",
      "#  ###",
      "##  ##",
      "###  #"
    ],
  },
  {
    name: "Mon",
    // prettier-ignore
    board: [
      "#   ##",
      " ### #",
      "##  ##",
      " ### #",
      "#   ##",
      "###   "
    ],
  },
  {
    name: "Tan",
    // prettier-ignore
    board: [
      "# ## #",
      "  ##  ",
      "# ## #",
      "##  ##",
      "# ## #",
      "##  ##"
    ],
  },
  {
    name: "Gor",
    // prettier-ignore
    board: [
      "  ##  ",
      "  ##  ",
      "#  #  ",
      "##   #",
      "####  ",
      "####  "
    ],
  },
  {
    name: "Lev",
    // prettier-ignore
    board: [
      "#   ##",
      "  ####",
      "#  #  ",
      "  ##  ",
      "     #",
      "##  ##"
    ],
  },
  {
    name: "Cif",
    // prettier-ignore
    board: [
      "##   #",
      " # # #",
      " #  # ",
      "# #   ",
      "#  #  ",
      "##   #"
    ],
  },
  {
    name: "Trailer",
    // prettier-ignore
    board: [
      "#    #",
      "      ",
      " #  # ",
      "##  ##",
      "      ",
      "# ## #"
    ],
  },
  {
    name: "Dev",
    // prettier-ignore
    board: [
      "##   #",
      "# #  #",
      "#  ## ",
      " ##  #",
      "#  # #",
      "#   ##"
    ],
  },
];

export const KNOWN_CORRECT_PATHS = {
  "Add/Add": "URUZU",
  "Eus/Eus": "LRURDRZLLZLZRRZRDLZDZDZLDR",
  "Eus/Tan wings": "LLRZUDDRDDLRZDURZRLZULUURZRLZRZUDDLDDUZDZ",
  "Lev/Lev": "LZRDDLDRDLLDLULLURURUULDLDU",
  "Tan/Tan":
    "RDDDDLUZDZULDZRUZDLUZDZRDDDLLULRZLUZUURRLZDLLUDRZRRRRLZULRZRRLZRRRUDDLLUZUUURLZDUZUDZULLUDRULZDRZUZLZ",
} as { [name: string]: string };
