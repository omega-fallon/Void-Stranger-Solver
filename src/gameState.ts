import type {
  Action,
  Board,
  Cell,
  Direction,
  GameState,
  StaffContent,
} from "./types";

export const ACTIONS: Action[] = ["up", "down", "left", "right", "staff"];

const DELTAS: Record<Direction, { dr: number; dc: number }> = {
  up: { dr: -1, dc: 0 },
  down: { dr: 1, dc: 0 },
  left: { dr: 0, dc: -1 },
  right: { dr: 0, dc: 1 },
};

function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < 6 && c >= 0 && c < 6;
}

function getCell(board: Board, r: number, c: number): Cell {
  return board[r]![c]!;
}

function setCell(board: Board, r: number, c: number, val: Cell): Board {
  return board.map((row, ri) =>
    ri === r ? row.map((cell, ci) => (ci === c ? val : cell)) : row
  );
}

export function applyAction(
  state: GameState,
  action: Action
): GameState | null {
  const { board, player } = state;
  const { row, col, facing, staffContent } = player;

  if (action !== "staff") {
    const { dr, dc } = DELTAS[action];
    const newRow = row + dr;
    const newCol = col + dc;
    if (!inBounds(newRow, newCol)) return null;
    if (getCell(board, newRow, newCol) === "empty") return null;

    const newBoard =
      getCell(board, row, col) === "glass"
        ? setCell(board, row, col, "empty")
        : board;

    return {
      board: newBoard,
      player: { row: newRow, col: newCol, facing: action, staffContent },
    };
  }

  // staff action — operates on the cell in front, player does not move
  const { dr, dc } = DELTAS[facing];
  const fr = row + dr;
  const fc = col + dc;
  if (!inBounds(fr, fc)) return null;

  const front = getCell(board, fr, fc);

  if (staffContent === "empty" && front !== "empty") {
    return {
      board: setCell(board, fr, fc, "empty"),
      player: { row, col, facing, staffContent: front as StaffContent },
    };
  }

  if (staffContent !== "empty" && front === "empty") {
    return {
      board: setCell(board, fr, fc, staffContent as Cell),
      player: { row, col, facing, staffContent: "empty" },
    };
  }

  return null;
}

export function stateKey(state: GameState): string {
  const cellChar = (c: Cell) =>
    c === "empty" ? "0" : c === "floor" ? "1" : c === "glass" ? "G" : "S";
  const boardStr = state.board.flat().map(cellChar).join("");
  const { row, col, facing, staffContent } = state.player;
  const staffStr =
    staffContent === "empty"
      ? "e"
      : staffContent === "floor"
      ? "t"
      : staffContent === "glass"
      ? "g"
      : "s";
  return `${boardStr}|${row},${col},${facing},${staffStr}`;
}

export function isGoal(state: GameState, target: Board): boolean {
  if (state.player.staffContent !== "stairs") return false;
  return state.board.every((row, r) =>
    row.every((cell, c) => cell === getCell(target, r, c))
  );
}

export function renderBoard(state: GameState): string {
  const { board, player } = state;
  const cellChar = (cell: Cell, r: number, c: number): string => {
    if (player.row === r && player.col === c) {
      const arrows: Record<Direction, string> = {
        up: "⇑ ",
        down: "⇓ ",
        left: "⇐ ",
        right: "⇒ ",
      };
      return arrows[player.facing];
    }
    switch (cell) {
      case "floor":
        return "██";
      case "glass":
        return "░░";
      case "stairs":
        return "S ";
      case "empty":
        return "  ";
    }
  };
  const rows = board.map(
    (row, r) => "│" + row.map((cell, c) => cellChar(cell, r, c)).join("") + "│"
  );
  return ["┌────────────┐", ...rows, "└────────────┘"].join("\n");
}
