import { applyPath, boardToStrings } from "./search.test";

// This is used to generate the partial solution states of a known solution path for the sake of creating tests
const states = applyPath(
  {
    // prettier-ignore
    board: [
      "GGGGGG",
      "GG##GG",
      "GG#GGG",
      "GGGGGG",
      "GGG GG",
      "GGGSGW"
    ],
    player: { row: 1, col: 2, facing: "down", staffContent: "empty" },
  },
  "LRURDRZLLZLZRRZRDLZDZDZLDR",
);
console.dir(
  states.map((state) => ({ ...state, board: boardToStrings(state.board) })),
  { depth: null },
);
