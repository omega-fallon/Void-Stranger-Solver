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
    player: { row: 3, col: 2, facing: "down", staffContent: [] },
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
    player: { row: 1, col: 2, facing: "down", staffContent: [] },
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
  //  player: { row: 3, col: 3, facing: "down", staffContent: [] },
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
    player: { row: 3, col: 3, facing: "down", staffContent: [] },
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
    player: { row: 0, col: 2, facing: "down", staffContent: [] },
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
    player: { row: 0, col: 5, facing: "down", staffContent: [] },
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
    player: { row: 0, col: 5, facing: "down", staffContent: [] },
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
    player: { row: 0, col: 5, facing: "down", staffContent: [] },
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
    player: { row: 4, col: 3, facing: "down", staffContent: [] },
  },
  {
    name: "DIS",
    // prettier-ignore
    board: parseBoard([
      "##T #G",
      "##GT #",
      "GT####",
      "#GT## ",
      " ##G#T",
      "A ##GS",
    ]),
    // prettier-ignore
    entities: parseEntities([
      " A  H ",
      " R   ~",
      "     W",
      "   RL ",
      "      ",
      "R     ",
    ]),
    player: { row: 0, col: 0, facing: "down", staffContent: [] },
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
    name: "DIS",
    // prettier-ignore
    board: parseBoard([
      "      ",
      "      ",
      "      ",
      "      ",
      "      ",
      "      "
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

// prettier-ignore
export const KNOWN_CORRECT_PATHS = {
  // Add
  "Add/Add":
    "URUZU",
  "Add/Add wings":
    "URUZUU",
    
  "Add/Eus universal":
    "IMPOSSIBLE",
    
  "Add/Bee universal":
    "IMPOSSIBLE",
    
  "Add/Mon universal":
    "IMPOSSIBLE",
    
  "Add/Tan universal":
    "IMPOSSIBLE",

  "Add/Gor":
    "IMPOSSIBLE",
  "Add/Gor wings":
    "IMPOSSIBLE",

  "Add/Lev":
    "IMPOSSIBLE",
  "Add/Lev wings":
    "IMPOSSIBLE",

  "Add/Cif":
    "IMPOSSIBLE",
  "Add/Cif wings":
    "IMPOSSIBLE",

  "Add/Trailer":
    "IMPOSSIBLE",
  "Add/Trailer wings":
    "IMPOSSIBLE",
    
  "Add/DIS universal":
    "IMPOSSIBLE",

  // Eus
  "Eus/Add wings":
    "DLLDDRDRZRRURULUULLDLZRURRLZLRZRZDZUZUDZLLDLZRURRZLLRZLDLZLDUZUDZRRLZRURZLZDLDZURURZLZDLUZDZRUZLUDZRRLZRZUDRZRR",
  
  "Eus/Eus":
    "LRURDRZLLZLZRRZRDLZDZDZLDR",
  "Eus/Eus wings":
    "LLRRURDRRLDLZDZDZLDUD",
  "Eus/Eus endless":
    "LZRURDRZDLZDZDZLDU",
  "Eus/Eus wings endless":
    "LZRURDRZDLZDZDZLDUD",
  
  "Eus/Bee wings":
    "ULLDRZRRDDZDZDRLULULRUUZRRZLDZDZLUZRZUDZURULZLL",
  
  "Eus/Tan wings":
    "LLRZUDDRDDLRZDURZRLZULUURZRLZRZUDDLDDUZDZDD",
  
  "Eus/Lev":
    "LZURRDLZLRZDDUUDZDDZURUZLDUZDZDLZRZULZRUZDZULRZRRZLLRZRLZUDZDRZLUZDDZRU",
  
  "Eus/Cif":
    "LZRRLZDLZRRLZUUDZRUDZDZUZRLZDZRZLZDUZDZDZRRUZLLUDZUZUZDDLRZUUDZUZURLDDUZDZDUZDZDLZRUUZDDUZDZDLRZUUZDZURLZLLRZURZRZR",
  
  "Eus/Trailer wings":
    "DLLURZUDZDRUURRDRLLDRZLLRZDUZLDDUUDZDDUUZDZDLRZUZLZRZDRRURLLZDLLRZUZU",

  // Bee

  // Mon
  "Mon/Eus":
    "UUZLDDUZUZLRZRRZLLDZDDDRRZLUULUURLZLZDLDDRDRRRZLZRRUUULZLZDZDZUUULLUDZRRDZULLDLRZRZLDZLURZUDZDUZU",
  
  "Mon/Mon":
    "UUZLDDUZUZLRZRZLZDLUZRRLZLZRRZLZRRDUUDZLLRZLDZDDUZLRRLZRDZULLDUZRLZUZDRRRZDZDRDLZUZUDZD",
  
  "Mon/Tan":
    "RRUZDDLDLLLULLURRRZRRDDLLZRRUULLZRRDDLZRUULLLZUULZURRRDLZULZDDDRUZLUURZLDDDZLLRZLURRZRRRDDZUUZDLZRDZUUZU",

  // Tan
  "Tan/Eus sword":
    "DDZRZZRZLLRZLZZLZRRDZULZZRDLZURZZRLZDZDUZDDZDDDUZDLLRZZRUZLLZDRUZLRZDDLZLLRRLZULLLZRRLZRULZRDZLURZRLZDZUZU",
  
  "Tan/Tan":
    "RDDDDLUZDZULDZRUZDLUZDZRDDDLLULRZLUZUURRLZDLLUDRZRRRRRLZULRZRRLZRRUDDLLUZUUUURLZDUZUUDZULLUZDRUZLZDRZUZLZL",
  "Tan/Tan wings sword":
    "RZLZDRZRZLLZLZRRDDLLRZRDZDLLRRDLZLZUZDUZDD",

  // Gor
  // Gor/Add
  
  // Gor/Eus
   
  "Gor/Bee":
    "DLLDZUUDZDUULZRRZLZDZDUZDZDLZRRULZDDUZDDRUZULDZLRZRRLLZRZRUUDZLUZRDLZURDZLUZU",
    
  //"Gor/Mon":
    
  "Gor/Gor":
    "DZLDLUURLDZDDLDRDRZURUULL",
  "Gor/Gor wings":
    "DZLUDDLLLRZDRRDRLDLRZU",
  "Gor/Gor wings sword":
    "DZLUDDLLLRZDRRDRLDLRZU",
  "Gor/Gor wings sword endless":
    "DZLUDLLLDRDRDDRZUUZDRLU",

  // Lev
  "Lev/Lev":
    "LZDDLRDLDLDLULLURULURURL",
  "Lev/Lev wings":
    "LZDDLRDLDLDLULLURULURURLR",
  "Lev/Lev endless":
    "LZDDLRDLDLDLULLURULURURL",
  "Lev/Lev wings endless":
    "LZDDLRDLDLDLULLURULURURLR",

  // Cif
  "Cif/Cif":
    "ZD",
  "Cif/Cif wings":
    "ZDD",
  "Cif/Cif endless":
    "ZD",
  "Cif/Cif wings endless":
    "ZDD",

  // DIS
  "DIS/Add wings sword":
    "DDRUDRRRUUULDRDRUZURDDDLUZDRUZDDDZLLLLZUZDZDRZRRZRULLLRZLDLZLRZUZUUULURZDRRZLZRRZRZDLLZDLUZDLRZRDLZLL",
  
  "DIS/Eus wings sword":
    "DDRUDRRRRUUULRZRDRDDDUZDLLLZLRDZLZUUZDLUUURDZDDUZDRDZDRZUZUUDZRULZRZDRZRDZUUZLLZRRDDZUULZRDZDULZDDUUDZRUUZUR",
  
  "DIS/Bee wings sword":
    "DDRUDRRRRUULURZRRDDDLUZDRUZDDUZUDZDDZLUUZRLZRDDZLUZURDZDDLZLLZURULULULURZDZDUZRZRLZDLDZDRZUZUZRURLLRZRZUU",
  
  "DIS/Mon wings sword":
    "DDRUDRRRRUULURZRDRDDLZURDZLUDZDDDLLZLRZURLLZLRZDUZUUDZDUZULUURZDZDDUZURZRUDZRLLRZLDDRLZLRZRRRRDZDD",
  
  "DIS/Tan wings sword":
    "DDRUDRRRRRUUZLRRDDLUZRDZDUZLLLLZLUURZRDDZLDUZDZRUZDDZUUDZRRUUZDZDUZLRZDDRRLZURDZUUZDDLDLZRZRLZULRUUUDZDLLLRZURDZRUUZUR",
} as { [name: string]: string };
