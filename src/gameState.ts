import { heuristic } from "./heuristic";
import { countFloorTiles } from "./search";
import type {
  Action,
  Board,
  Cell,
  Direction,
  Entity,
  EntityGrid,
  GameState,
  StaffContent,
} from "./types";

export const ACTIONS: Action[] = ["left", "up", "right", "down", "staff"];

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
    ri === r ? row.map((cell, ci) => (ci === c ? val : cell)) : row,
  );
}

function getEntity(entities: EntityGrid, r: number, c: number): Entity {
  return entities[r]![c]!;
}

function setEntity(
  entities: EntityGrid,
  r: number,
  c: number,
  val: Entity,
): EntityGrid {
  return entities.map((row, ri) =>
    ri === r ? row.map((e, ci) => (ci === c ? val : e)) : row,
  );
}

export function applyAction(
  state: GameState,
  action: Action,
): GameState | null {
  const { board, entities, player } = state;
  const { row, col, facing, staffContent } = player;

  if (action !== "staff") {
    const { dr, dc } = DELTAS[action];
    const newRow = row + dr;
    const newCol = col + dc;
    if (!inBounds(newRow, newCol)) return null;
    const dest = getCell(board, newRow, newCol);
    if (dest === "wall" || dest === "stairs") return null;

    // Rock-push: if there is a rock in the destination cell, attempt to push it.
    if (getEntity(entities, newRow, newCol) === "rock") {
      const rockDestRow = newRow + dr;
      const rockDestCol = newCol + dc;
      // Rock cannot be pushed out of bounds, into a wall, or into another rock.
      if (!inBounds(rockDestRow, rockDestCol)) return null;
      if (getCell(board, rockDestRow, rockDestCol) === "wall") return null;
      if (getEntity(entities, rockDestRow, rockDestCol) === "rock") return null;

      // Push succeeds: rock moves, player stays in place (facing updates).
      // Glass does not break because the player did not step off their current cell.
      const newEntities = setEntity(
        setEntity(entities, newRow, newCol, "empty"),
        rockDestRow,
        rockDestCol,
        getCell(board, rockDestRow, rockDestCol) === "empty" ? "empty" : "rock",
      );
      // Break any glass the rock was on
      const newBoard =
        getCell(board, newRow, newCol) === "glass"
          ? setCell(board, newRow, newCol, "empty")
          : board;
      return {
        board: newBoard,
        entities: newEntities,
        player: { row, col, facing: action, staffContent },
      };
    }

    // Normal move — no rock in the way.
    const newBoard =
      getCell(board, row, col) === "glass"
        ? setCell(board, row, col, "empty")
        : board;

    return {
      board: newBoard,
      entities,
      player: { row: newRow, col: newCol, facing: action, staffContent },
    };
  }

  // staff action — operates on the cell in front, player does not move
  const { dr, dc } = DELTAS[facing];
  const fr = row + dr;
  const fc = col + dc;
  if (!inBounds(fr, fc)) return null;

  const front = getCell(board, fr, fc);

  if (staffContent === "empty" && front !== "empty" && front !== "wall") {
    return {
      board: setCell(board, fr, fc, "empty"),
      entities,
      player: { row, col, facing, staffContent: front as StaffContent },
    };
  }

  if (staffContent !== "empty" && front === "empty") {
    return {
      board: setCell(board, fr, fc, staffContent as Cell),
      entities,
      player: { row, col, facing, staffContent: "empty" },
    };
  }

  return null;
}

export function stateKey(state: GameState): string {
  const cellChar = (c: Cell) =>
    c === "empty"
      ? "0"
      : c === "floor"
      ? "1"
      : c === "glass"
      ? "G"
      : c === "wall"
      ? "W"
      : "S";
  const boardStr = state.board.flat().map(cellChar).join("");
  const entityStr = state.entities
    .flat()
    .map((e) => (e === "rock" ? "R" : "0"))
    .join("");
  const { row, col, facing, staffContent } = state.player;
  const staffStr =
    staffContent === "empty"
      ? "e"
      : staffContent === "floor"
      ? "t"
      : staffContent === "glass"
      ? "g"
      : "s";
  return `${boardStr}|${entityStr}|${row},${col},${facing},${staffStr}`;
}

// Glass and floor are interchangeable for goal satisfaction — the brand only
// requires "solid tile present" or "empty", not a specific solid type.
export function cellMatchesTarget(cell: Cell, target: Cell): boolean {
  if (target === "floor" || target === "glass") {
    return cell === "floor" || cell === "glass";
  }
  return cell === target;
}

export function isGoal(
  state: GameState,
  target: Board,
  requireFinalJump = true,
): boolean {
  if (requireFinalJump) {
    if (state.player.staffContent !== "stairs") return false;
    if (getCell(state.board, state.player.row, state.player.col) !== "empty")
      return false;
  }
  return state.board.every((row, r) =>
    row.every((cell, c) => cellMatchesTarget(cell, getCell(target, r, c))),
  );
}

export function replayPath(
  initial: GameState,
  path: Action[],
  target: Board,
  requireFinalJump = true,
): void {
  console.log("\n--- Solution replay ---");
  let state = initial;
  console.log(`\nStep 0 (initial):\n${renderBoard(state)}\n`);
  for (let i = 0; i < path.length; i++) {
    const action = path[i]!;
    state = applyAction(state, action)!;
    console.log(
      `Step ${i + 1}: ${action} | h: ${heuristic(state, target)}\n${renderBoard(
        state,
      )}\n`,
    );
    if (isGoal(state, target, requireFinalJump)) console.log("Goal reached!");
  }
}

export function renderBoard(state: GameState, requiredTiles?: number): string {
  const { board, entities, player } = state;
  const cellChar = (cell: Cell, r: number, c: number): string => {
    // Priority: player arrow > rock > board cell
    let overlayChar: string | null = null;
    if (player.row === r && player.col === c) {
      const arrows: Record<Direction, string> = {
        up: "⇑",
        down: "⇓",
        left: "⇐",
        right: "⇒",
      };
      overlayChar = arrows[player.facing];
    } else if (entities[r]?.[c] === "rock") {
      overlayChar = "R";
    }
    let floorChar = "  ";
    switch (cell) {
      case "floor":
        floorChar = "██";
        break;
      case "glass":
        floorChar = "░░";
        break;
      case "stairs":
        floorChar = "S ";
        break;
      case "wall":
        floorChar = "▓▓";
        break;
      case "empty":
        floorChar = "  ";
        break;
    }
    return overlayChar ? overlayChar + floorChar.slice(1) : floorChar;
  };
  const rows = board.map(
    (row, r) => "│" + row.map((cell, c) => cellChar(cell, r, c)).join("") + "│",
  );
  const numFloorTilesRemaining =
    countFloorTiles(board) +
    (["floor", "glass"].includes(state.player.staffContent) ? 1 : 0);
  return (
    `${numFloorTilesRemaining} floor tiles remain${
      requiredTiles ? ` out of a necessary ${requiredTiles}` : ""
    }\n` + ["┌────────────┐", ...rows, "└────────────┘"].join("\n")
  );
}
