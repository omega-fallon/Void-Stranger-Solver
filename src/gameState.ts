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
  if (r < 0 || c < 0) {
    throw new Error(
      "getCell given negative inputs, why?" + String(r) + " " + String(c),
    );
  }

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
      if (
        getCell(board, i, i2) === "button" &&
        getEntity(grid, i, i2) !== "empty"
      ) {
        return false;
      }
    }
  }
  return true;
}

// Causes any floating non-player entities to fall, and automatically calls triggerWatcher if needed.
function checkFallen(board: Board, entities: EntityGrid): EntityGrid {
  let watchers_needing_triggering = 0;
  for (let i = 0; i < 6; i++) {
    for (let i2 = 0; i2 < 6; i2++) {
      if (board[i]![i2]! === "empty" && entities[i]![i2]! !== "empty") {
        if (entities[i]![i2]! === "watcher_active") {
          watchers_needing_triggering += 1;
        }
        entities[i]![i2]! = "empty";
      }
    }
  }

  for (let i = 0; i < watchers_needing_triggering; i++) {
    entities = triggerWatcher(entities);
  }

  return entities;
}

function disperseTraps(board: Board, row: number, column: number): Board {
  let triggered_tiles: number[][] = [[row, column]];
  let done_anything: boolean = true;

  // Iterate through each triggered_tile's neighbors and add them to the list if they're also active traps. Repeatedly do this until nothing changes.
  while (done_anything) {
    done_anything = false;

    const array2 = triggered_tiles.slice();
    for (let coord of array2) {
      let r: number = coord[0]!;
      let c: number = coord[1]!;

      if (
        !String(triggered_tiles).includes(String([r - 1, c])) &&
        r >= 1 &&
        board[r - 1]![c]! === "trap_active"
      ) {
        done_anything = true;
        triggered_tiles.push([r - 1, c]);
      }
      if (
        !String(triggered_tiles).includes(String([r, c - 1])) &&
        c >= 1 &&
        board[r]![c - 1]! === "trap_active"
      ) {
        done_anything = true;
        triggered_tiles.push([r, c - 1]);
      }
      if (
        !String(triggered_tiles).includes(String([r + 1, c])) &&
        r <= 4 &&
        board[r + 1]![c]! === "trap_active"
      ) {
        done_anything = true;
        triggered_tiles.push([r + 1, c]);
      }
      if (
        !String(triggered_tiles).includes(String([r, c + 1])) &&
        c <= 4 &&
        board[r]![c + 1]! === "trap_active"
      ) {
        done_anything = true;
        triggered_tiles.push([r, c + 1]);
      }
    }
  }

  // Found them all, now remove them.
  let newBoard = board;
  for (let coord of triggered_tiles) {
    newBoard = setCell(newBoard, coord[0]!, coord[1]!, "empty");
  }

  // All done!
  return newBoard;
}

// Triggers the first watcher it encounters. If it doesn't encounter one, does nothing.
function triggerWatcher(entities: EntityGrid): EntityGrid {
  // Deep copy the array so we don't mutate the original
  let newEntities = entities.map((row) => row.map((v) => v)) as EntityGrid;
  for (let i = 0; i < 6; i++) {
    for (let i2 = 0; i2 < 6; i2++) {
      if (entities[i]![i2]! === "watcher_inactive") {
        newEntities[i]![i2]! = "watcher_active";
        return newEntities;
      }
    }
  }
  return newEntities;
}

// Handling for monster statues.
function anyMonsters(entities: EntityGrid): boolean {
  for (let i = 0; i < 6; i++) {
    for (let i2 = 0; i < 6; i++) {
      if (getEntity(entities, i, i2) == "hand") {
        return true;
      }
    }
  }
  return false;
}
function disperseMonsterStatues(entities: EntityGrid): EntityGrid {
  if (!anyMonsters(entities)) {
    for (let i = 0; i < 6; i++) {
      for (let i2 = 0; i < 6; i++) {
        if (getEntity(entities, i, i2) == "monster_statue") {
          return setEntity(entities, i, i2, "empty");
        }
      }
    }
  }
  return entities;
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
    if (
      !inBounds(newRow, newCol) ||
      getCell(board, newRow, newCol) === "wall" ||
      getEntity(entities, newRow, newCol) === "chest"
    ) {
      if (facing === action && wingsActive === false) {
        return null;
      }
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

    // Hands... hands!
    if (getEntity(entities, newRow, newCol) === "hand") {
      return null;
    }

    // Stairs...
    else if (
      getEntity(entities, newRow, newCol) === "empty" &&
      dest === "stairs"
    ) {
      // ...are impassable.
      if (stairsActive(board, entities)) {
        return null;
      }
      // ...are walkable
      else {
        // Normal move. Remove glass if walking off it.
        const newBoard =
          getCell(board, row, col) === "glass" ?
            setCell(board, row, col, "empty")
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
        };
      }
    }

    // Rock-pushing
    else if (
      getEntity(entities, newRow, newCol) === "rock" ||
      getEntity(entities, newRow, newCol) === "watcher_inactive" ||
      getEntity(entities, newRow, newCol) === "watcher_active" ||
      getEntity(entities, newRow, newCol) === "monster_statue"
    ) {
      const rockDestRow = newRow + dr;
      const rockDestCol = newCol + dc;

      // If any of these things are true, we push but nothing happens, equivalent to hitting a wall.
      if (
        !inBounds(rockDestRow, rockDestCol) ||
        getCell(board, rockDestRow, rockDestCol) === "wall" ||
        getEntity(entities, rockDestRow, rockDestCol) === "rock" ||
        getEntity(entities, rockDestRow, rockDestCol) === "watcher_inactive" ||
        getEntity(entities, rockDestRow, rockDestCol) === "watcher_active" ||
        getEntity(entities, rockDestRow, rockDestCol) === "chest" ||
        getEntity(entities, rockDestRow, rockDestCol) === "monster_statue"
      ) {
        //console.log("f-f-f-failure");
        if (facing === action && wingsActive === false) {
          return null;
        } else {
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
      }

      // Break any glass the rock was pushed off of.
      let newBoard =
        getCell(board, newRow, newCol) === "glass" ?
          setCell(board, newRow, newCol, "empty")
        : board;
      let newEntities = entities;

      // Pushing into void.
      if (getCell(newBoard, rockDestRow, rockDestCol) === "empty") {
        newEntities = setEntity(
          setEntity(newEntities, newRow, newCol, "empty"),
          rockDestRow,
          rockDestCol,
          "empty",
        );

        // Pushing an active watcher.
        if (getEntity(entities, newRow, newCol) === "watcher_active") {
          newEntities = triggerWatcher(newEntities);
        }
      }
      // Pushing onto an inactive trap.
      else if (
        getCell(newBoard, rockDestRow, rockDestCol) === "trap_inactive"
      ) {
        newBoard = setCell(newBoard, rockDestRow, rockDestCol, "trap_active");

        newEntities = setEntity(
          setEntity(entities, newRow, newCol, "empty"),
          rockDestRow,
          rockDestCol,
          getEntity(entities, newRow, newCol),
        );
      }
      // Pushing onto an ACTIVE trap.
      else if (getCell(newBoard, rockDestRow, rockDestCol) === "trap_active") {
        // Disperse all traps.
        newBoard = disperseTraps(newBoard, rockDestRow, rockDestCol);

        // Set up the rock above the void...
        newEntities = setEntity(
          setEntity(entities, newRow, newCol, "empty"),
          rockDestRow,
          rockDestCol,
          getEntity(entities, newRow, newCol),
        );

        // ...and then trigger all fallings.
        newEntities = checkFallen(newBoard, newEntities);
      }
      // Normal
      else {
        newEntities = setEntity(
          setEntity(entities, newRow, newCol, "empty"),
          rockDestRow,
          rockDestCol,
          getEntity(entities, newRow, newCol),
        );
      }

      return {
        board: newBoard,
        entities: disperseMonsterStatues(newEntities),
        player: {
          row,
          col,
          facing: action,
          staffContent,
          wingsActive: false, //always false after a push
        },
      };
    }

    // failsafe
    else if (getEntity(entities, newRow, newCol) !== "empty") {
      throw new Error(
        "Couldn't figure out entity in gameState logic: " +
          String(getEntity(entities, newRow, newCol)),
      );
    }

    // ── Flying (wings active) ─────────────────────────────────────────────
    else if (wingsActive) {
      let newBoard = board;
      let newEntities = entities;

      // Walking onto inactive trap
      if (getCell(board, newRow, newCol) === "trap_inactive") {
        newBoard = setCell(newBoard, newRow, newCol, "trap_active");
      }
      // Walking onto ACTIVE trap
      else if (getCell(board, newRow, newCol) === "trap_active") {
        newBoard = disperseTraps(newBoard, newRow, newCol); //dead!

        // Account for any fallen entities.
        newEntities = checkFallen(newBoard, newEntities);
      }

      // Another void tile — fall to your doom. Origin was empty, so no glass to break.
      // OR
      // Solid tile. Origin was empty, so no glass to break.
      return {
        board: newBoard,
        entities: disperseMonsterStatues(newEntities),
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
      // Normal move.
      let newBoard =
        getCell(board, row, col) === "glass" ?
          setCell(board, row, col, "empty")
        : board;
      let newEntities = entities;

      // Walking onto inactive trap
      if (getCell(newBoard, newRow, newCol) === "trap_inactive") {
        newBoard = setCell(newBoard, newRow, newCol, "trap_active");
      }
      // Walking onto ACTIVE trap
      else if (getCell(newBoard, newRow, newCol) === "trap_active") {
        newBoard = disperseTraps(newBoard, newRow, newCol);

        // Account for any fallen entities.
        newEntities = checkFallen(newBoard, newEntities);
      }

      // Wings activate if the player steps into the void.
      const newWingsActive =
        hasWings && getCell(newBoard, newRow, newCol) === "empty";

      return {
        board: newBoard,
        entities: disperseMonsterStatues(newEntities),
        player: {
          row: newRow,
          col: newCol,
          facing: action,
          staffContent,
          wingsActive: newWingsActive,
        },
      };
    }
  } else {
    // ── Staff action — player does not move; wingsActive passes through unchanged ─
    const { dr, dc } = DELTAS[facing];
    const fr = row + dr;
    const fc = col + dc;
    if (!inBounds(fr, fc)) return null;

    const front = getCell(board, fr, fc);

    // Chest and upwards?
    if (facing === "up" && getEntity(entities, fr, fc) === "chest") {
      // Turn chest into rock and face downward.
      return {
        board: board,
        entities: disperseMonsterStatues(setEntity(entities, fr, fc, "rock")),
        player: {
          row,
          col,
          facing: "down",
          staffContent,
          wingsActive: player.wingsActive ?? false,
        },
      };
    }
    // Check for other entities in front cell.
    else if (getEntity(entities, fr, fc) !== "empty") {
      return null;
    } else {
      const newEntities = triggerWatcher(entities);

      if (staffContent === "empty" && front !== "empty" && front !== "wall") {
        return {
          board: setCell(board, fr, fc, "empty"),
          entities: disperseMonsterStatues(newEntities),
          player: {
            row,
            col,
            facing,
            staffContent: front as StaffContent,
            wingsActive: player.wingsActive ?? false,
          },
        };
      } else if (staffContent !== "empty" && front === "empty") {
        return {
          board: setCell(board, fr, fc, staffContent as Cell),
          entities: disperseMonsterStatues(newEntities),
          player: {
            row,
            col,
            facing,
            staffContent: "empty",
            wingsActive: player.wingsActive ?? false,
          },
        };
      } else {
        return null;
      }
    }
  }

  throw new Error("applyAction failsafe triggered.");
  return null;
}

export function stateKey(state: GameState): string {
  // We wrap these in IIFEs so the profiler names each part individually
  function cellChar(c: Cell) {
    return (
      c === "empty" ? " "
      : c === "floor" ? "#"
      : c === "glass" ? "G"
      : c === "wall" ? "W"
      : c === "button" ? "B"
      : c === "stairs" ? "S"
      : c === "trap_active" ? "A"
      : c === "trap_inactive" ? "T"
      : "?"
    );
  }
  const boardStr = (function getBoardStr() {
    let str = "";
    state.board.forEach((row) => row.forEach((c) => (str += cellChar(c))));
    return str;
  })();
  const entityStr = (function getEntityStr() {
    let str = "";
    state.entities.forEach((row) =>
      row.forEach(
        (c) =>
          (str +=
            c === "rock" ? "R"
            : c === "beaver" ? "B"
            : c === "mimic" ? "M"
            : c === "hand" ? "H"
            : c === "watcher_inactive" ? "W"
            : c === "watcher_active" ? "!"
            : c === "chest" ? "C"
            : c === "monster_statue" ? "~"
            : " "),
      ),
    );
    return str;
  })();
  const { row, col, facing, staffContent, wingsActive } =
    (function getStatePlayer() {
      return state.player;
    })();
  const staffStr = (function getStaffStr() {
    return (
      staffContent === "empty" ? "e"
      : staffContent === "floor" ? "f"
      : staffContent === "glass" ? "g"
      : staffContent === "button" ? "b"
      : staffContent === "trap_inactive" ? "t"
      : staffContent === "trap_active" ? "a"
      : "s"
    );
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
  if (cell === "stairs") {
    // Stairs never matches target.
    return false;
  } else if (target === "empty") {
    //
    return cell === "empty";
  } else {
    // Process of elimination: target is not empty and could never be stairs, so it must be one floor, glass, wall, button, trap_inactive, or trap_active. However we've also pruned cell === stairs, so we can just test if cell is empty now.
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
    } else if (entities[r]?.[c] === "watcher_inactive") {
      overlayChar = "W";
    } else if (entities[r]?.[c] === "watcher_active") {
      overlayChar = "!";
    } else if (entities[r]?.[c] === "chest") {
      overlayChar = "C";
    } else if (entities[r]?.[c] === "monster_statue") {
      overlayChar = "~";
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
