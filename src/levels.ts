import type { Board, EntityGrid, PlayerState } from "./types";
import { parseBoard, parseEntities } from "./utils";

/** A level pairing an initial brane state with a target brand board. */
export interface RawLevel {
  name: string;
  initial: {
    board: Board;
    entities?: EntityGrid;
    player: PlayerState;
  };
  target: Board;
  requireFinalJump?: boolean;
}

export interface RawBraneInitial {
  name: string;
  board: Board;
  entities: EntityGrid;
  player: PlayerState;
  knownPath?: string;
}

export interface RawBrand {
  name: string;
  board: Board;
}

// Board encoding: " " empty  "#" floor  "G" glass  "S" stairs  "W" wall  "B" button  "T" inactive trap  "A" active trap
export const BRANES: RawBraneInitial[] = [
  {
    name: "Add",
    // prettier-ignore
    board: parseBoard([
      "#  S #",
      "   ## ",
      " #####",
      "##### ",
      " ##   ",
      "#    #",
    ]),
    // prettier-ignore
    entities: parseEntities([
      "      ",
      "      ",
      "      ",
      "      ",
      "      ",
      "      ",
    ]),
    player: { row: 3, col: 2, facing: "down", staffContent: "empty" },
  },
  {
    name: "Eus",
    // prettier-ignore
    board: parseBoard([
      "GGGGGG",
      "GG##GG",
      "GG#GGG",
      "GGGGGG",
      "GGG GG",
      "GGGSG#",
    ]),
    // prettier-ignore
    entities: parseEntities([
      "      ",
      "      ",
      "      ",
      "      ",
      "      ",
      "     R",
    ]),
    player: { row: 1, col: 2, facing: "down", staffContent: "empty" },
  },
  //{
  //  name: "Bee",
  //  // prettier-ignore
  //  board: parseBoard([
  //    "  ### ",
  //    " ## ##",
  //    " #   #",
  //    " S ## ",
  //    "#   ##",
  //    "##### ",
  //  ]),
  //  // prettier-ignore
  //  entities: parseEntities([
  //    "      ",
  //    "      ",
  //    "      ",
  //    " B    ",
  //    "      ",
  //    "R     ",
  //  ]),
  //  player: { row: 3, col: 3, facing: "down", staffContent: "empty" },
  //},
  {
    name: "Mon",
    // prettier-ignore
    board: parseBoard([
      "B#####",
      "#GGGG#",
      "#G#GG#",
      "#GG#G#",
      "#GGGG#",
      "#####S",
    ]),
    // prettier-ignore
    entities: parseEntities([
      "     R",
      "      ",
      "      ",
      "      ",
      "    R ",
      "R     ",
    ]),
    player: { row: 3, col: 3, facing: "down", staffContent: "empty" },
  },
  {
    name: "Tan",
    // prettier-ignore
    board: parseBoard([
      "#G##G#",
      "GG##GG",
      "#G##G#",
      "##SG##",
      "#G##G#",
      "##GG##",
    ]),
    // prettier-ignore
    entities: parseEntities([
      "~H  H~",
      "HH  HH",
      "~H~~H~",
      "   H  ",
      " H~ H ",
      "  HH  ",
    ]),
    player: { row: 0, col: 2, facing: "down", staffContent: "empty" },
  },
  {
    name: "Gor",
    // prettier-ignore
    board: parseBoard([
      "GG##GG",
      "GG##GG",
      "GGGGG#",
      "#GGGG#",
      "GG##GG",
      "WG##GS",
    ]),
    // prettier-ignore
    entities: parseEntities([
      "M     ",
      "      ",
      "      ",
      "     R",
      "      ",
      "R     ",
    ]),
    player: { row: 0, col: 5, facing: "down", staffContent: "empty" },
  },
  {
    name: "Lev",
    // prettier-ignore
    board: parseBoard([
      "#TTS##",
      "TT####",
      "#TT#TT",
      "TT##TT",
      "TTTTT#",
      "##TT##",
    ]),
    // prettier-ignore
    entities: parseEntities([
      "C     ",
      "      ",
      "   W  ",
      "      ",
      "      ",
      "W     ",
    ]),
    player: { row: 0, col: 5, facing: "down", staffContent: "empty" },
  },
  {
    name: "Lev-glass",
    // prettier-ignore
    board: parseBoard([
      "#GGS##",
      "GG####",
      "#GG#GG",
      "GG##GG",
      "GGGGG#",
      "##GG##",
    ]),
    // prettier-ignore
    entities: parseEntities([
      "C     ",
      "      ",
      "   W  ",
      "      ",
      "      ",
      "W     ",
    ]),
    player: { row: 0, col: 5, facing: "down", staffContent: "empty" },
  },
  {
    name: "Cif",
    // prettier-ignore
    board: parseBoard([
      "W#   W",
      " # # #",
      " #  # ",
      "# #   ",
      "#  #  ",
      "W# S W",
    ]),
    // prettier-ignore
    entities: parseEntities([
      "      ",
      "      ",
      "      ",
      "      ",
      "      ",
      "      ",
    ]),
    player: { row: 4, col: 3, facing: "down", staffContent: "empty" },
  },
];

export const BRANDS: RawBrand[] = [
  {
    name: "Add",
    // prettier-ignore
    board: parseBoard([
      "#    #",
      "   ## ",
      " #####",
      "##### ",
      " ##   ",
      "#    #"
    ]),
  },
  {
    name: "Eus",
    // prettier-ignore
    board: parseBoard([
      "##  ##",
      "  ##  ",
      "##   #",
      "### ##",
      "## ###",
      "##  ##"
    ]),
  },
  {
    name: "Bee",
    // prettier-ignore
    board: parseBoard([
      "     #",
      "  ##  ",
      "###  #",
      "#  ###",
      "##  ##",
      "###  #"
    ]),
  },
  {
    name: "Mon",
    // prettier-ignore
    board: parseBoard([
      "#   ##",
      " ### #",
      "##  ##",
      " ### #",
      "#   ##",
      "###   "
    ]),
  },
  {
    name: "Tan",
    // prettier-ignore
    board: parseBoard([
      "# ## #",
      "  ##  ",
      "# ## #",
      "##  ##",
      "# ## #",
      "##  ##"
    ]),
  },
  {
    name: "Gor",
    // prettier-ignore
    board: parseBoard([
      "  ##  ",
      "  ##  ",
      "#  #  ",
      "##   #",
      "####  ",
      "####  "
    ]),
  },
  {
    name: "Lev",
    // prettier-ignore
    board: parseBoard([
      "#   ##",
      "  ####",
      "#  #  ",
      "  ##  ",
      "     #",
      "##  ##"
    ]),
  },
  {
    name: "Cif",
    // prettier-ignore
    board: parseBoard([
      "##   #",
      " # # #",
      " #  # ",
      "# #   ",
      "#  #  ",
      "##   #"
    ]),
  },
  {
    name: "Trailer",
    // prettier-ignore
    board: parseBoard([
      "#    #",
      "      ",
      " #  # ",
      "##  ##",
      "      ",
      "# ## #"
    ]),
  },
  {
    name: "Dev",
    // prettier-ignore
    board: parseBoard([
      "##   #",
      "# #  #",
      "#  ## ",
      " ##  #",
      "#  # #",
      "#   ##"
    ]),
  },
];

export const KNOWN_CORRECT_PATHS = {
  // Add
  "Add/Add": "URUZU",
  
  // Eus
  "Eus/Add wings": "DLLDDRDRZRRURULUULLDLZRURRLZLRZRZDZUZUDZLLDLZRURRZLLRZLDLZLDUZUDZRRLZRURZLZDLDZURURZLZDLUZDZRUZLUDZRRLZRZUDRZRR",
  "Eus/Eus": "LRURDRZLLZLZRRZRDLZDZDZLDR",
  "Eus/Eus wings": "LLRRURDRRLDLZDZDZLDU",
  "Eus/Bee wings": "ULLDRZRRDDZDZDRLULULRUUZRRZLDZDZLUZRZUDZURULZL",
  "Eus/Tan wings": "LLRZUDDRDDLRZDURZRLZULUURZRLZRZUDDLDDUZDZD",
  "Eus/Lev": "LZURRDLZLRZDDUUDZDDZURUZLDUZDZDLZRZULZRUZDZULRZRRZLLRZRLZUDZDRZLUZDDZRU",
  "Eus/Cif": "LZRRLZDLZRRLZUUDZRUDZDZUZRLZDZRZLZDUZDZDZRRUZLLUDZUZUZDDLRZUUDZUZURLDDUZDZDUZDZDLZRUUZDDUZDZDLRZUUZDZURLZLLRZURZRZR",
  "Eus/Trailer wings": "DLLURZUDZDRUURRDRLLDRZLLRZDUZLDDUUDZDDUUZDZDLRZUZLZRZDRRURLLZDLLRZUZU",
  
  // Bee
  
  // Mon
  "Mon/Eus": "UUZLDDUZUZLRZRRZLLDZDDDRRZLUULUURLZLZDLDDRDRRRZLZRRUUULZLZDZDZUUULLUDZRRDZULLDLRZRZLDZLURZUDZDUZU",
  "Mon/Mon": "UUZLDDUZUZLRZRZLZDLUZRRLZLZRRZLZRRDUUDZLLRZLDZDDUZLRRLZRDZULLDUZRLZUZDRRRZDZDRDLZUZUDZD",
  "Mon/Tan": "RRUZDDLDLLLULLURRRZRRDDLLZRRUULLZRRDDLZRUULLLZUULZURRRDLZULZDDDRUZLUURZLDDDZLLRZLURRZRRRDDZUUZDLZRDZUUZU",
  
  // Tan
  // "Tan/Tan": "RDDDDLUZDZULDZRUZDLUZDZRDDDLLULRZLUZUURRLZDLLUDRZRRRRLZULRZRRLZRRRUDDLLUZUUURLZDUZUDZULLUDRULZDRZUZLZ",
  
  // Gor
  "Gor/Bee": "DLLDZUUDZDUULZRRZLZDZDUZDZDLZRRULZDDUZDDRUZULDZLRZRRLLZRZRUUDZLUZRDLZURDZLUZU",
  
  "Gor/Gor": "DZLDLUURLDZDDLDRDRZURUULL",
  "Gor/Gor wings": "DZLUDDLLLRZDRRDRLDLRZU",
  
  // Lev
  "Lev/Lev": "LZDDLRDLDLDLULLURULURURL",
  "Lev/Lev wings": "LZDDLRDLDLDLULLURULURURL",
  
  // Cif
  "Cif/Cif": "ZD",
  "Cif/Cif wings": "ZDD",
  
  // DIS
} as { [name: string]: string };
