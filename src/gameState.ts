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
import { actionsToString } from "./utils";

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

function stairsActive(board: Board, grid: EntityGrid): boolean {
  for (let i = 0; i < 6; i++) {
    for (let i2 = 0; i2 < 6; i2++) {
      // Check if the cell is a button AND has a non-player entity on it.
      if (getCell(board, i, i2) === "button" && getEntity(grid, i, i2) !== "empty") {
        return false;
      }
    }
  }
  return true;
}

export function applyAction(
  state: GameState,
  action: Action,
  hasWings = false,
): GameState | null {
  const { board, entities, player } = state;
  const { row, col, facing, staffContent } = player;
  const wingsActive = hasWings && (player.wingsActive ?? false);
  //const swordActive = hasSword && (player.swordActive ?? false);
  //const endlessActive = hasEndless && (player.endlessActive ?? false);

  // Movement!
  if (action !== "staff") {
    const { dr, dc } = DELTAS[action];
    const newRow = row + dr;
    const newCol = col + dc;

    // Wall bump!
    if (!inBounds(newRow, newCol)) {
      return {
        board,
        entities,
        player: {
          row,
          col,
          facing: action,
          staffContent,
          wingsActive: false, // Bumping always disables
        },
      };
    }
    
    const dest = getCell(board, newRow, newCol);
    
    // Stairs...
    if (dest === "stairs") {
      // ...are impassable.
      if (stairsActive(board, entities)) {
        return null;
      }
      // ...are walkable
      else {
        // Normal move. Remove glass if walking off it.
        const newBoard =
        getCell(board, row, col) === "glass"
          ? setCell(board, row, col, "empty")
          : board;

        return {
          board: newBoard,
          entities,
          player: {
            row: newRow,
            col: newCol,
            facing: action,
            staffContent,
            wingsActive: false,
          },
        }
      }
    }

    // Rock-push while airborne: push succeeds if the cell behind the rock is
    // clear (in-bounds, not a wall, not another rock). Player falls in place
    // (stays on current empty cell, facing updates, wings deactivate).
    if (getEntity(entities, newRow, newCol) === "rock") {
      const rockDestRow = newRow + dr;
      const rockDestCol = newCol + dc;
        
      // If any of these three things are true, we push but nothing happens, equivalent to hitting a wall.
      if ((!inBounds(rockDestRow, rockDestCol)) || (getCell(board, rockDestRow, rockDestCol) === "wall") || (getEntity(entities, rockDestRow, rockDestCol) === "rock")) {
        return {
          board,
          entities,
          player: {
            row,
            col,
            facing: action,
            staffContent,
            wingsActive: false,
          },
        };
      }

      const newEntities = setEntity(
        setEntity(entities, newRow, newCol, "empty"),
        rockDestRow,
        rockDestCol,
        getCell(board, rockDestRow, rockDestCol) === "empty"
          ? "empty"
          : "rock",
      );
      // Break any glass the rock was pushed off of.
      const newBoard =
        getCell(board, newRow, newCol) === "glass"
          ? setCell(board, newRow, newCol, "empty")
          : board;
      return {
        board: newBoard,
        entities: newEntities,
        player: {
          row,
          col,
          facing: action,
          staffContent,
          wingsActive: false,
        },
      };
    }
    
    // ── Flying (wings active) ─────────────────────────────────────────────
    if (wingsActive) {
      // Another void tile — fall to your doom. Origin was empty, so no glass to break.
      // OR
      // Solid tile (floor or glass) — land. Origin was empty, so no glass to break.
      return {
        board,
        entities,
        player: {
          row: newRow,
          col: newCol,
          facing: action,
          staffContent,
          wingsActive: false,
        },
      };
    }
    // ── Not flying (wings inactive) ─────────────────────────────────────────────
    else {
      // Normal move. Wings activate if the player steps into the void.
      const newBoard =
        getCell(board, row, col) === "glass"
          ? setCell(board, row, col, "empty")
          : board;
      const newWingsActive = hasWings && dest === "empty";

      return {
        board: newBoard,
        entities,
        player: {
          row: newRow,
          col: newCol,
          facing: action,
          staffContent,
          wingsActive: newWingsActive,
        },
      };
    }
  }
  else {
    // ── Staff action — player does not move; wingsActive passes through unchanged ─
    const { dr, dc } = DELTAS[facing];
    const fr = row + dr;
    const fc = col + dc;
    if (!inBounds(fr, fc)) return null;
  
    const front = getCell(board, fr, fc);

    // Check for entities in front cell.
    if (getEntity(entities, fr, fc) !== "empty") {
      return null;
    }
    else {
      if (staffContent === "empty" && front !== "empty" && front !== "wall") {
        return {
          board: setCell(board, fr, fc, "empty"),
          entities,
          player: {
            row,
            col,
            facing,
            staffContent: front as StaffContent,
            wingsActive: player.wingsActive ?? false,
          },
        };
      }

      // TODO check for entities in front cell.
      if (staffContent !== "empty" && front === "empty") {
        return {
          board: setCell(board, fr, fc, staffContent as Cell),
          entities,
          player: {
            row,
            col,
            facing,
            staffContent: "empty",
            wingsActive: player.wingsActive ?? false,
          },
        };
      }
    }
  }

  return null;
}

export function stateKey(state: GameState): string {
  // We wrap these in IIFEs so the profiler names each part individually
  function cellChar(c: Cell) {
    return c === "empty"
      ? " "
      : c === "floor"
      ? "#"
      : c === "glass"
      ? "G"
      : c === "wall"
      ? "W"
      : c === "button"
      ? "B"
      : c === "stairs"
      ? "S"
      : c === "trap_active"
      ? "A"
      : c === "trap_inactive"
      ? "T"
      : "?";
  }
  const boardStr = (function getBoardStr() {
    let str = "";
    state.board.forEach((row) => row.forEach((c) => (str += cellChar(c))));
    return str;
  })();
  const entityStr = (function getEntityStr() {
    let str = "";
    state.entities.forEach((row) =>
      row.forEach((c) => (str += c === "rock" ? "R" : " ")),
    );
    return str;
  })();
  const { row, col, facing, staffContent, wingsActive } =
    (function getStatePlayer() {
      return state.player;
    })();
  const staffStr = (function getStaffStr() {
    return staffContent === "empty"
      ? "e"
      : staffContent === "floor"
      ? "f"
      : staffContent === "glass"
      ? "g"
      : staffContent === "button"
      ? "b"
      : staffContent === "trap_inactive"
      ? "t"
      : staffContent === "trap_active"
      ? "a"
      : "s";
  })();
  const wingsStr = wingsActive ? "W" : "0";
  //const swordStr = swordActive ? "S" : "0";
  //const endlessStr = endlessActive ? "E" : "0";
  return (function combineString() {
    return `${boardStr}|${entityStr}|${row},${col},${facing},${staffStr},${wingsStr}`;
  })();
}

// Non-(empty or stairs) are interchangeable for goal satisfaction — the brand only
// requires "solid tile present" or "empty", not a specific solid type.
export function cellMatchesTarget(cell: Cell, target: Cell): boolean {
  if (cell === "stairs") { // Stairs never matches target.
    return false
  }
  else if (target === "empty") { // 
    return cell === "empty"
  }
  else { // Process of elimination: target is not empty and could never be stairs, so it must be one floor, glass, wall, button, trap_inactive, or trap_active. However we've also pruned cell === stairs, so we can just test if cell is empty now.
    return cell !== "empty";
  }
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
      `Step ${i + 1}: ${action} | h: ${
        heuristic(state, target, requireFinalJump).total
      }\n${renderBoard(state)}\n`,
    );
    if (isGoal(state, target, requireFinalJump)) {
      console.log("Goal reached!");
      console.log(actionsToString(path));
    }
  }
}

function renderCellFloor(cell: Cell) {
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
    case "button":
      floorChar = "█B";
      break;
    case "trap_inactive":
      floorChar = "ΘΘ";
      break;
    case "trap_active":
      floorChar = "ϴϴ";
      break;
    case "empty":
      floorChar = "  ";
      break;
    default:
      floorChar = "??";
      break;
  }
  return floorChar;
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
    } else if (entities[r]?.[c] === "beaver") {
      overlayChar = "B";
    } else if (entities[r]?.[c] === "mimic") {
      overlayChar = "M";
    } else if (entities[r]?.[c] === "hand") {
      overlayChar = "H";
    }
    let floorChar = renderCellFloor(cell);
    return overlayChar ? overlayChar + floorChar.slice(1) : floorChar;
  };
  const rows = board.map(
    (row, r) => "│" + row.map((cell, c) => cellChar(cell, r, c)).join("") + "│",
  );
  const numFloorTilesRemaining =
    countFloorTiles(board) +
    (["floor", "glass"].includes(state.player.staffContent) ? 1 : 0);
  const wingsIndicator = state.player.wingsActive ? " 🦋" : "";
  //const swordIndicator = state.player.swordActive ? " 🗡️" : "";
  //const endlessIndicator = state.player.endlessActive ? " 🪄" : "";
  return (
    `${numFloorTilesRemaining} floor tiles remain${
      requiredTiles ? ` out of a necessary ${requiredTiles}` : ""
    }\n` +
    ["┌────────────┐", ...rows, "└────────────┘"].join("\n") +
    `\nstaff: [${renderCellFloor(
      state.player.staffContent,
    )}]${wingsIndicator}\n`
  );
}
