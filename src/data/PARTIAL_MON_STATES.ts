// TODO: Correct these after implementing button logic, so that stairs are walkable when button not pressed. This solution path is the same until the last couple steps without that though.
// This was generated using generatePartialSteps.ts. TODO Maybe just call that instead of using this file.
export const PARTIAL_MON_STATES = [
  {
    name: "Mon step 0",
    // prettier-ignore
    "board": [
      "######",
      "#GGGG#",
      "#G#GG#",
      "#GG#G#",
      "#GGGG#",
      "######"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "    R ",
      "R     "
    ],
    player: { row: 2, col: 3, facing: "up", staffContent: [] },
  },
  {
    name: "Mon step 1",
    // prettier-ignore
    "board": [
      "######",
      "#GGGG#",
      "#G# G#",
      "#GG#G#",
      "#GGGG#",
      "######"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "    R ",
      "R     "
    ],
    player: { row: 1, col: 3, facing: "up", staffContent: [] },
  },
  {
    name: "Mon step 2",
    // prettier-ignore
    "board": [
      "### ##",
      "#GGGG#",
      "#G# G#",
      "#GG#G#",
      "#GGGG#",
      "######"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "    R ",
      "R     "
    ],
    player: { row: 1, col: 3, facing: "up", staffContent: ["floor"] },
  },
  {
    name: "Mon step 3",
    // prettier-ignore
    "board": [
      "### ##",
      "#GG G#",
      "#G# G#",
      "#GG#G#",
      "#GGGG#",
      "######"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "    R ",
      "R     "
    ],
    player: { row: 1, col: 2, facing: "left", staffContent: ["floor"] },
  },
  {
    name: "Mon step 4",
    // prettier-ignore
    "board": [
      "### ##",
      "#G  G#",
      "#G# G#",
      "#GG#G#",
      "#GGGG#",
      "######"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "    R ",
      "R     "
    ],
    player: { row: 2, col: 2, facing: "down", staffContent: ["floor"] },
  },
  {
    name: "Mon step 5",
    // prettier-ignore
    "board": [
      "### ##",
      "#G  G#",
      "#G# G#",
      "#GG#G#",
      "#GGGG#",
      "######"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "    R ",
      "R     "
    ],
    player: { row: 3, col: 2, facing: "down", staffContent: ["floor"] },
  },
  {
    name: "Mon step 6",
    // prettier-ignore
    "board": [
      "### ##",
      "#G  G#",
      "#G# G#",
      "#G #G#",
      "#GGGG#",
      "######"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "    R ",
      "R     "
    ],
    player: { row: 2, col: 2, facing: "up", staffContent: ["floor"] },
  },
  {
    name: "Mon step 7",
    // prettier-ignore
    "board": [
      "### ##",
      "#G# G#",
      "#G# G#",
      "#G #G#",
      "#GGGG#",
      "######"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "    R ",
      "R     "
    ],
    player: { row: 2, col: 2, facing: "up", staffContent: [] },
  },
  {
    name: "Mon step 8",
    // prettier-ignore
    "board": [
      "### ##",
      "#G# G#",
      "#G# G#",
      "#G #G#",
      "#GGGG#",
      "######"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "    R ",
      "R     "
    ],
    player: { row: 1, col: 2, facing: "up", staffContent: [] },
  },
  {
    name: "Mon step 9",
    // prettier-ignore
    "board": [
      "##  ##",
      "#G# G#",
      "#G# G#",
      "#G #G#",
      "#GGGG#",
      "######"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "    R ",
      "R     "
    ],
    player: { row: 1, col: 2, facing: "up", staffContent: ["floor"] },
  },
  {
    name: "Mon step 10",
    // prettier-ignore
    "board": [
      "##  ##",
      "#G# G#",
      "#G# G#",
      "#G #G#",
      "#GGGG#",
      "######"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "    R ",
      "R     "
    ],
    player: { row: 1, col: 1, facing: "left", staffContent: ["floor"] },
  },
  {
    name: "Mon step 11",
    // prettier-ignore
    "board": [
      "##  ##",
      "# # G#",
      "#G# G#",
      "#G #G#",
      "#GGGG#",
      "######"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "    R ",
      "R     "
    ],
    player: { row: 1, col: 2, facing: "right", staffContent: ["floor"] },
  },
  {
    name: "Mon step 12",
    // prettier-ignore
    "board": [
      "##  ##",
      "# ##G#",
      "#G# G#",
      "#G #G#",
      "#GGGG#",
      "######"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "    R ",
      "R     "
    ],
    player: { row: 1, col: 2, facing: "right", staffContent: [] },
  },
  {
    name: "Mon step 13",
    // prettier-ignore
    "board": [
      "##  ##",
      "# ##G#",
      "#G# G#",
      "#G #G#",
      "#GGGG#",
      "######"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "    R ",
      "R     "
    ],
    player: { row: 1, col: 3, facing: "right", staffContent: [] },
  },
  {
    name: "Mon step 14",
    // prettier-ignore
    "board": [
      "##  ##",
      "# ## #",
      "#G# G#",
      "#G #G#",
      "#GGGG#",
      "######"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "    R ",
      "R     "
    ],
    player: { row: 1, col: 3, facing: "right", staffContent: ["glass"] },
  },
  {
    name: "Mon step 15",
    // prettier-ignore
    "board": [
      "##  ##",
      "# ## #",
      "#G# G#",
      "#G #G#",
      "#GGGG#",
      "######"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "    R ",
      "R     "
    ],
    player: { row: 1, col: 2, facing: "left", staffContent: ["glass"] },
  },
  {
    name: "Mon step 16",
    // prettier-ignore
    "board": [
      "##  ##",
      "#G## #",
      "#G# G#",
      "#G #G#",
      "#GGGG#",
      "######"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "    R ",
      "R     "
    ],
    player: { row: 1, col: 2, facing: "left", staffContent: [] },
  },
  {
    name: "Mon step 17",
    // prettier-ignore
    "board": [
      "##  ##",
      "#G## #",
      "#G# G#",
      "#G #G#",
      "#GGGG#",
      "######"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "    R ",
      "R     "
    ],
    player: { row: 2, col: 2, facing: "down", staffContent: [] },
  },
  {
    name: "Mon step 18",
    // prettier-ignore
    "board": [
      "##  ##",
      "#G## #",
      "#G# G#",
      "#G #G#",
      "#GGGG#",
      "######"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "    R ",
      "R     "
    ],
    player: { row: 2, col: 1, facing: "left", staffContent: [] },
  },
  {
    name: "Mon step 19",
    // prettier-ignore
    "board": [
      "##  ##",
      "#G## #",
      "# # G#",
      "#G #G#",
      "#GGGG#",
      "######"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "    R ",
      "R     "
    ],
    player: { row: 1, col: 1, facing: "up", staffContent: [] },
  },
  {
    name: "Mon step 20",
    // prettier-ignore
    "board": [
      "#   ##",
      "#G## #",
      "# # G#",
      "#G #G#",
      "#GGGG#",
      "######"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "    R ",
      "R     "
    ],
    player: { row: 1, col: 1, facing: "up", staffContent: ["floor"] },
  },
  {
    name: "Mon step 21",
    // prettier-ignore
    "board": [
      "#   ##",
      "# ## #",
      "# # G#",
      "#G #G#",
      "#GGGG#",
      "######"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "    R ",
      "R     "
    ],
    player: { row: 1, col: 2, facing: "right", staffContent: ["floor"] },
  },
  {
    name: "Mon step 22",
    // prettier-ignore
    "board": [
      "#   ##",
      "# ## #",
      "# # G#",
      "#G #G#",
      "#GGGG#",
      "######"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "    R ",
      "R     "
    ],
    player: { row: 1, col: 3, facing: "right", staffContent: ["floor"] },
  },
  {
    name: "Mon step 23",
    // prettier-ignore
    "board": [
      "#   ##",
      "# ## #",
      "# # G#",
      "#G #G#",
      "#GGGG#",
      "######"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "    R ",
      "R     "
    ],
    player: { row: 1, col: 2, facing: "left", staffContent: ["floor"] },
  },
  {
    name: "Mon step 24",
    // prettier-ignore
    "board": [
      "#   ##",
      "#### #",
      "# # G#",
      "#G #G#",
      "#GGGG#",
      "######"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "    R ",
      "R     "
    ],
    player: { row: 1, col: 2, facing: "left", staffContent: [] },
  },
  {
    name: "Mon step 25",
    // prettier-ignore
    "board": [
      "#   ##",
      "#### #",
      "# # G#",
      "#G #G#",
      "#GGGG#",
      "######"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "    R ",
      "R     "
    ],
    player: { row: 1, col: 1, facing: "left", staffContent: [] },
  },
  {
    name: "Mon step 26",
    // prettier-ignore
    "board": [
      "#   ##",
      " ### #",
      "# # G#",
      "#G #G#",
      "#GGGG#",
      "######"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "    R ",
      "R     "
    ],
    player: { row: 1, col: 1, facing: "left", staffContent: ["floor"] },
  },
  {
    name: "Mon step 27",
    // prettier-ignore
    "board": [
      "#   ##",
      " ### #",
      "# # G#",
      "#G #G#",
      "#GGGG#",
      "######"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "    R ",
      "R     "
    ],
    player: { row: 1, col: 2, facing: "right", staffContent: ["floor"] },
  },
  {
    name: "Mon step 28",
    // prettier-ignore
    "board": [
      "#   ##",
      " ### #",
      "# # G#",
      "#G #G#",
      "#GGGG#",
      "######"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "    R ",
      "R     "
    ],
    player: { row: 1, col: 3, facing: "right", staffContent: ["floor"] },
  },
  {
    name: "Mon step 29",
    // prettier-ignore
    "board": [
      "#   ##",
      " #####",
      "# # G#",
      "#G #G#",
      "#GGGG#",
      "######"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "    R ",
      "R     "
    ],
    player: { row: 1, col: 3, facing: "right", staffContent: [] },
  },
  {
    name: "Mon step 30",
    // prettier-ignore
    "board": [
      "#   ##",
      " #####",
      "# # G#",
      "#G #G#",
      "#GGGG#",
      "######"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "    R ",
      "R     "
    ],
    player: { row: 1, col: 2, facing: "left", staffContent: [] },
  },
  {
    name: "Mon step 31",
    // prettier-ignore
    "board": [
      "#   ##",
      "  ####",
      "# # G#",
      "#G #G#",
      "#GGGG#",
      "######"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "    R ",
      "R     "
    ],
    player: { row: 1, col: 2, facing: "left", staffContent: ["floor"] },
  },
  {
    name: "Mon step 32",
    // prettier-ignore
    "board": [
      "#   ##",
      "  ####",
      "# # G#",
      "#G #G#",
      "#GGGG#",
      "######"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "    R ",
      "R     "
    ],
    player: { row: 1, col: 3, facing: "right", staffContent: ["floor"] },
  },
  {
    name: "Mon step 33",
    // prettier-ignore
    "board": [
      "#   ##",
      "  ####",
      "# # G#",
      "#G #G#",
      "#GGGG#",
      "######"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "    R ",
      "R     "
    ],
    player: { row: 1, col: 4, facing: "right", staffContent: ["floor"] },
  },
  {
    name: "Mon step 34",
    // prettier-ignore
    "board": [
      "#   ##",
      "  ####",
      "# # G#",
      "#G #G#",
      "#GGGG#",
      "######"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "    R ",
      "R     "
    ],
    player: { row: 2, col: 4, facing: "down", staffContent: ["floor"] },
  },
  {
    name: "Mon step 35",
    // prettier-ignore
    "board": [
      "#   ##",
      "  ####",
      "# #  #",
      "#G #G#",
      "#GGGG#",
      "######"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "    R ",
      "R     "
    ],
    player: { row: 1, col: 4, facing: "up", staffContent: ["floor"] },
  },
  {
    name: "Mon step 36",
    // prettier-ignore
    "board": [
      "#   ##",
      "  ####",
      "# #  #",
      "#G #G#",
      "#GGGG#",
      "######"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "    R ",
      "R     "
    ],
    player: { row: 0, col: 4, facing: "up", staffContent: ["floor"] },
  },
  {
    name: "Mon step 37",
    // prettier-ignore
    "board": [
      "#   ##",
      "  ####",
      "# #  #",
      "#G #G#",
      "#GGGG#",
      "######"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "    R ",
      "R     "
    ],
    player: { row: 1, col: 4, facing: "down", staffContent: ["floor"] },
  },
  {
    name: "Mon step 38",
    // prettier-ignore
    "board": [
      "#   ##",
      "  ####",
      "# # ##",
      "#G #G#",
      "#GGGG#",
      "######"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "    R ",
      "R     "
    ],
    player: { row: 1, col: 4, facing: "down", staffContent: [] },
  },
  {
    name: "Mon step 39",
    // prettier-ignore
    "board": [
      "#   ##",
      "  ####",
      "# # ##",
      "#G #G#",
      "#GGGG#",
      "######"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "    R ",
      "R     "
    ],
    player: { row: 1, col: 3, facing: "left", staffContent: [] },
  },
  {
    name: "Mon step 40",
    // prettier-ignore
    "board": [
      "#   ##",
      "  ####",
      "# # ##",
      "#G #G#",
      "#GGGG#",
      "######"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "    R ",
      "R     "
    ],
    player: { row: 1, col: 2, facing: "left", staffContent: [] },
  },
  {
    name: "Mon step 41",
    // prettier-ignore
    "board": [
      "#   ##",
      "  ####",
      "# # ##",
      "#G #G#",
      "#GGGG#",
      "######"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "    R ",
      "R     "
    ],
    player: { row: 1, col: 3, facing: "right", staffContent: [] },
  },
  {
    name: "Mon step 42",
    // prettier-ignore
    "board": [
      "#   ##",
      "  ## #",
      "# # ##",
      "#G #G#",
      "#GGGG#",
      "######"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "    R ",
      "R     "
    ],
    player: { row: 1, col: 3, facing: "right", staffContent: ["floor"] },
  },
  {
    name: "Mon step 43",
    // prettier-ignore
    "board": [
      "#   ##",
      "  ## #",
      "# # ##",
      "#G #G#",
      "#GGGG#",
      "######"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "    R ",
      "R     "
    ],
    player: { row: 1, col: 2, facing: "left", staffContent: ["floor"] },
  },
  {
    name: "Mon step 44",
    // prettier-ignore
    "board": [
      "#   ##",
      "  ## #",
      "# # ##",
      "#G #G#",
      "#GGGG#",
      "######"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "    R ",
      "R     "
    ],
    player: { row: 2, col: 2, facing: "down", staffContent: ["floor"] },
  },
  {
    name: "Mon step 45",
    // prettier-ignore
    "board": [
      "#   ##",
      "  ## #",
      "# # ##",
      "#G##G#",
      "#GGGG#",
      "######"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "    R ",
      "R     "
    ],
    player: { row: 2, col: 2, facing: "down", staffContent: [] },
  },
  {
    name: "Mon step 46",
    // prettier-ignore
    "board": [
      "#   ##",
      "  ## #",
      "# # ##",
      "#G##G#",
      "#GGGG#",
      "######"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "    R ",
      "R     "
    ],
    player: { row: 3, col: 2, facing: "down", staffContent: [] },
  },
  {
    name: "Mon step 47",
    // prettier-ignore
    "board": [
      "#   ##",
      "  ## #",
      "# # ##",
      "#G##G#",
      "#GGGG#",
      "######"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "    R ",
      "R     "
    ],
    player: { row: 4, col: 2, facing: "down", staffContent: [] },
  },
  {
    name: "Mon step 48",
    // prettier-ignore
    "board": [
      "#   ##",
      "  ## #",
      "# # ##",
      "#G##G#",
      "#G GG#",
      "######"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "    R ",
      "R     "
    ],
    player: { row: 3, col: 2, facing: "up", staffContent: [] },
  },
  {
    name: "Mon step 49",
    // prettier-ignore
    "board": [
      "#   ##",
      "  ## #",
      "#   ##",
      "#G##G#",
      "#G GG#",
      "######"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "    R ",
      "R     "
    ],
    player: { row: 3, col: 2, facing: "up", staffContent: ["floor"] },
  },
  {
    name: "Mon step 50",
    // prettier-ignore
    "board": [
      "#   ##",
      "  ## #",
      "#   ##",
      "#G##G#",
      "#G GG#",
      "######"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "    R ",
      "R     "
    ],
    player: { row: 3, col: 1, facing: "left", staffContent: ["floor"] },
  },
  {
    name: "Mon step 51",
    // prettier-ignore
    "board": [
      "#   ##",
      "  ## #",
      "#   ##",
      "# ##G#",
      "#G GG#",
      "######"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "    R ",
      "R     "
    ],
    player: { row: 3, col: 2, facing: "right", staffContent: ["floor"] },
  },
  {
    name: "Mon step 52",
    // prettier-ignore
    "board": [
      "#   ##",
      "  ## #",
      "#   ##",
      "# ##G#",
      "#G GG#",
      "######"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "    R ",
      "R     "
    ],
    player: { row: 3, col: 3, facing: "right", staffContent: ["floor"] },
  },
  {
    name: "Mon step 53",
    // prettier-ignore
    "board": [
      "#   ##",
      "  ## #",
      "#   ##",
      "# ##G#",
      "#G GG#",
      "######"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "    R ",
      "R     "
    ],
    player: { row: 3, col: 2, facing: "left", staffContent: ["floor"] },
  },
  {
    name: "Mon step 54",
    // prettier-ignore
    "board": [
      "#   ##",
      "  ## #",
      "#   ##",
      "####G#",
      "#G GG#",
      "######"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "    R ",
      "R     "
    ],
    player: { row: 3, col: 2, facing: "left", staffContent: [] },
  },
  {
    name: "Mon step 55",
    // prettier-ignore
    "board": [
      "#   ##",
      "  ## #",
      "#   ##",
      "####G#",
      "#G GG#",
      "######"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "    R ",
      "R     "
    ],
    player: { row: 3, col: 3, facing: "right", staffContent: [] },
  },
  {
    name: "Mon step 56",
    // prettier-ignore
    "board": [
      "#   ##",
      "  ## #",
      "#   ##",
      "####G#",
      "#G GG#",
      "######"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "    R ",
      "R     "
    ],
    player: { row: 4, col: 3, facing: "down", staffContent: [] },
  },
  {
    name: "Mon step 57",
    // prettier-ignore
    "board": [
      "#   ##",
      "  ## #",
      "#   ##",
      "####G#",
      "#G GG#",
      "### ##"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "    R ",
      "R     "
    ],
    player: { row: 4, col: 3, facing: "down", staffContent: ["floor"] },
  },
  {
    name: "Mon step 58",
    // prettier-ignore
    "board": [
      "#   ##",
      "  ## #",
      "#   ##",
      "####G#",
      "#G  G#",
      "### ##"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "    R ",
      "R     "
    ],
    player: { row: 3, col: 3, facing: "up", staffContent: ["floor"] },
  },
  {
    name: "Mon step 59",
    // prettier-ignore
    "board": [
      "#   ##",
      "  ## #",
      "#   ##",
      "####G#",
      "#G  G#",
      "### ##"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "    R ",
      "R     "
    ],
    player: { row: 3, col: 2, facing: "left", staffContent: ["floor"] },
  },
  {
    name: "Mon step 60",
    // prettier-ignore
    "board": [
      "#   ##",
      "  ## #",
      "#   ##",
      "####G#",
      "#G  G#",
      "### ##"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "    R ",
      "R     "
    ],
    player: { row: 3, col: 1, facing: "left", staffContent: ["floor"] },
  },
  {
    name: "Mon step 61",
    // prettier-ignore
    "board": [
      "#   ##",
      "  ## #",
      "#   ##",
      "####G#",
      "#G  G#",
      "### ##"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "    R ",
      "R     "
    ],
    player: { row: 4, col: 1, facing: "down", staffContent: ["floor"] },
  },
  {
    name: "Mon step 62",
    // prettier-ignore
    "board": [
      "#   ##",
      "  ## #",
      "#   ##",
      "####G#",
      "#   G#",
      "### ##"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "    R ",
      "R     "
    ],
    player: { row: 3, col: 1, facing: "up", staffContent: ["floor"] },
  },
  {
    name: "Mon step 63",
    // prettier-ignore
    "board": [
      "#   ##",
      "  ## #",
      "##  ##",
      "####G#",
      "#   G#",
      "### ##"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "    R ",
      "R     "
    ],
    player: { row: 3, col: 1, facing: "up", staffContent: [] },
  },
  {
    name: "Mon step 64",
    // prettier-ignore
    "board": [
      "#   ##",
      "  ## #",
      "##  ##",
      "####G#",
      "#   G#",
      "### ##"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "    R ",
      "R     "
    ],
    player: { row: 3, col: 2, facing: "right", staffContent: [] },
  },
  {
    name: "Mon step 65",
    // prettier-ignore
    "board": [
      "#   ##",
      "  ## #",
      "##  ##",
      "####G#",
      "#   G#",
      "### ##"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "    R ",
      "R     "
    ],
    player: { row: 3, col: 1, facing: "left", staffContent: [] },
  },
  {
    name: "Mon step 66",
    // prettier-ignore
    "board": [
      "#   ##",
      "  ## #",
      "##  ##",
      " ###G#",
      "#   G#",
      "### ##"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "    R ",
      "R     "
    ],
    player: { row: 3, col: 1, facing: "left", staffContent: ["floor"] },
  },
  {
    name: "Mon step 67",
    // prettier-ignore
    "board": [
      "#   ##",
      "  ## #",
      "##  ##",
      " ###G#",
      "#   G#",
      "### ##"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "    R ",
      "R     "
    ],
    player: { row: 2, col: 1, facing: "up", staffContent: ["floor"] },
  },
  {
    name: "Mon step 68",
    // prettier-ignore
    "board": [
      "#   ##",
      " ### #",
      "##  ##",
      " ###G#",
      "#   G#",
      "### ##"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "    R ",
      "R     "
    ],
    player: { row: 2, col: 1, facing: "up", staffContent: [] },
  },
  {
    name: "Mon step 69",
    // prettier-ignore
    "board": [
      "#   ##",
      " ### #",
      "##  ##",
      " ###G#",
      "#   G#",
      "### ##"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "    R ",
      "R     "
    ],
    player: { row: 3, col: 1, facing: "down", staffContent: [] },
  },
  {
    name: "Mon step 70",
    // prettier-ignore
    "board": [
      "#   ##",
      " ### #",
      "##  ##",
      " ###G#",
      "#   G#",
      "### ##"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "    R ",
      "R     "
    ],
    player: { row: 3, col: 2, facing: "right", staffContent: [] },
  },
  {
    name: "Mon step 71",
    // prettier-ignore
    "board": [
      "#   ##",
      " ### #",
      "##  ##",
      " ###G#",
      "#   G#",
      "### ##"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "    R ",
      "R     "
    ],
    player: { row: 3, col: 3, facing: "right", staffContent: [] },
  },
  {
    name: "Mon step 72",
    // prettier-ignore
    "board": [
      "#   ##",
      " ### #",
      "##  ##",
      " ###G#",
      "#   G#",
      "### ##"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "    R ",
      "R     "
    ],
    player: { row: 3, col: 4, facing: "right", staffContent: [] },
  },
  {
    name: "Mon step 73",
    // prettier-ignore
    "board": [
      "#   ##",
      " ### #",
      "##  ##",
      " ###G ",
      "#   G#",
      "### ##"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "    R ",
      "R     "
    ],
    player: { row: 3, col: 4, facing: "right", staffContent: ["floor"] },
  },
  {
    name: "Mon step 74",
    // prettier-ignore
    "board": [
      "#   ##",
      " ### #",
      "##  ##",
      " ###G ",
      "#    #",
      "### ##"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "      ",
      "R   R "
    ],
    player: { row: 3, col: 4, facing: "down", staffContent: ["floor"] },
  },
  {
    name: "Mon step 75",
    // prettier-ignore
    "board": [
      "#   ##",
      " ### #",
      "##  ##",
      " ###G ",
      "#   ##",
      "### ##"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "      ",
      "R   R "
    ],
    player: { row: 3, col: 4, facing: "down", staffContent: [] },
  },
  {
    name: "Mon step 76",
    // prettier-ignore
    "board": [
      "#   ##",
      " ### #",
      "##  ##",
      " ###  ",
      "#   ##",
      "### ##"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "      ",
      "R   R "
    ],
    player: { row: 4, col: 4, facing: "down", staffContent: [] },
  },
  {
    name: "Mon step 77",
    // prettier-ignore
    "board": [
      "#   ##",
      " ### #",
      "##  ##",
      " ###  ",
      "#   ##",
      "### ##"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "      ",
      "R   R "
    ],
    player: { row: 4, col: 5, facing: "right", staffContent: [] },
  },
  {
    name: "Mon step 78",
    // prettier-ignore
    "board": [
      "#   ##",
      " ### #",
      "##  ##",
      " ###  ",
      "#   ##",
      "### ##"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "      ",
      "R   R "
    ],
    player: { row: 5, col: 5, facing: "down", staffContent: [] },
  },
  {
    name: "Mon step 79",
    // prettier-ignore
    "board": [
      "#   ##",
      " ### #",
      "##  ##",
      " ###  ",
      "#   ##",
      "### ##"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "      ",
      "R  R  "
    ],
    player: { row: 5, col: 5, facing: "left", staffContent: [] },
  },
  {
    name: "Mon step 80",
    // prettier-ignore
    "board": [
      "#   ##",
      " ### #",
      "##  ##",
      " ###  ",
      "#   ##",
      "###  #"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "      ",
      "R  R  "
    ],
    player: { row: 5, col: 5, facing: "left", staffContent: ["floor"] },
  },
  {
    name: "Mon step 81",
    // prettier-ignore
    "board": [
      "#   ##",
      " ### #",
      "##  ##",
      " ###  ",
      "#   ##",
      "###  #"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "      ",
      "R  R  "
    ],
    player: { row: 4, col: 5, facing: "up", staffContent: ["floor"] },
  },
  {
    name: "Mon step 82",
    // prettier-ignore
    "board": [
      "#   ##",
      " ### #",
      "##  ##",
      " ### #",
      "#   ##",
      "###  #"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "      ",
      "R  R  "
    ],
    player: { row: 4, col: 5, facing: "up", staffContent: [] },
  },
  {
    name: "Mon step 83",
    // prettier-ignore
    "board": [
      "#   ##",
      " ### #",
      "##  ##",
      " ### #",
      "#   ##",
      "###  #"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "      ",
      "R  R  "
    ],
    player: { row: 3, col: 5, facing: "up", staffContent: [] },
  },
  {
    name: "Mon step 84",
    // prettier-ignore
    "board": [
      "#   ##",
      " ### #",
      "##  ##",
      " ### #",
      "#   ##",
      "###  #"
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "      ",
      "R  R  "
    ],
    player: { row: 4, col: 5, facing: "down", staffContent: [] },
  },
  {
    name: "Mon step 85",
    // prettier-ignore
    "board": [
      "#   ##",
      " ### #",
      "##  ##",
      " ### #",
      "#   ##",
      "###   "
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "      ",
      "R  R  "
    ],
    player: { row: 4, col: 5, facing: "down", staffContent: ["floor"] },
  },
  {
    name: "Mon step 86",
    // prettier-ignore
    "board": [
      "#   ##",
      " ### #",
      "##  ##",
      " ### #",
      "#   ##",
      "###   "
    ],
    // prettier-ignore
    "entities": [
      "     R",
      "      ",
      "      ",
      "      ",
      "      ",
      "R  R  "
    ],
    player: { row: 5, col: 5, facing: "down", staffContent: ["floor"] },
    requireFinalJump: true,
  },
];
