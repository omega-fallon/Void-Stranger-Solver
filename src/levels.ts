import type { PlayerState } from "./types";

export interface RawBraneInitial {
    name: string;
    board: string[];
    entities: string[];
    player: PlayerState;
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
        "GGGSGW",
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
    //    "W#### ",
    //  ],
    //  player: { row: 3, col: 3, facing: "down", staffContent: "empty" },
    //},
    {
      name: "Mon",
      // prettier-ignore
      board: [
        "B####W",
        "#GGGG#",
        "#G#GG#",
        "#GG#G#",
        "#GGGG#",
        "W####S",
      ],
      // prettier-ignore
      entities: [
        "      ",
        "      ",
        "      ",
        "      ",
        "    R ",
        "      ",
      ],
      player: { row: 3, col: 3, facing: "down", staffContent: "empty" },
    },
    //{
    //  name: "Tan",
    //  // prettier-ignore
    //  board: [
    //    "#G##G#",
    //    "GG##GG",
    //    "#G##G#",
    //    "##SG##",
    //    "#G##G#",
    //    "##GG##",
    //  ],
    //  player: { row: 0, col: 2, facing: "down", staffContent: "empty" },
    //},
    //{
    //  name: "Gor",
    //  // prettier-ignore
    //  board: [
    //    "GG##GG",
    //    "GG##GG",
    //    "GGGGG#",
    //    "#GGGG#",
    //    "GG##GG",
    //    "WG##GS",
    //  ],
    //  player: { row: 0, col: 5, facing: "down", staffContent: "empty" },
    //},
    //{
    //  name: "Lev",
    //  // prettier-ignore
    //  board: [
    //    "XXXXXX",
    //    "XXXXXX",
    //    "XXXXXX",
    //    "XXXXXX",
    //    "XXXXXX",
    //    "XXXXXX",
    //  ],
    //  player: { row: 0, col: 5, facing: "down", staffContent: "empty" },
    //},
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
]

export const BRANDS: RawBrand[] = [
    {
        name: "Add",
        board: [
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
        board: [
          "##  ##",
          "  ##  ",
          "##   #",
          "### ##",
          "## ###",
          "##  ##",
        ],
    },
    {
        name: "Bee",
        board: [
          "     #",
          "  ##  ",
          "###  #",
          "#  ###",
          "##  ##",
          "###  #",
        ],
    },
    {
        name: "Mon",
        board: [
          "#   ##",
          " ### #",
          "##  ##",
          " ### #",
          "#   ##",
          "###   ",
        ],
    },
    {
        name: "Tan",
        board: [
          "# ## #",
          "  ##  ",
          "# ## #",
          "##  ##",
          "# ## #",
          "##  ##",
        ],
    },
    {
        name: "Gor",
        board: [
          "  ##  ",
          "  ##  ",
          "#  #  ",
          "##   #",
          "####  ",
          "####  ",
        ],
    },
    {
        name: "Lev",
        board: [
          "#   ##",
          "  ####",
          "#  #  ",
          "  ##  ",
          "     #",
          "##  ##",
        ],
    },
    {
        name: "Cif",
        board: [
          "##   #",
          " # # #",
          " #  # ",
          "# #   ",
          "#  #  ",
          "##    #",
        ],
    },
]