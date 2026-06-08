import { heuristic } from "./heuristic";
import { countFloorTiles } from "./search";
import { NO_BURDENS } from "./types";
import type {
  Action,
  Board,
  Burdens,
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

export function inBounds(r: number, c: number): boolean {
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
      // Check if the cell is a button and doesn't have an entity on it.
      if (
        getCell(board, i, i2) === "button" &&
        getEntity(grid, i, i2) === "empty"
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
  let triggered_tiles: [number, number][] = [[row, column]];
  let done_anything: boolean = true;

  // Iterate through each triggered_tile's neighbors and add them to the list if they're also active traps. Repeatedly do this until nothing changes.
  while (done_anything) {
    done_anything = false;

    const array2 = triggered_tiles.slice();
    for (const coord of array2) {
      const r: number = coord[0];
      const c: number = coord[1];

      const triggeredTileCoordStrings = triggered_tiles.map((pair) =>
        pair.toString(),
      );
      if (
        !triggeredTileCoordStrings.includes(String([r - 1, c])) &&
        r >= 1 &&
        board[r - 1]![c]! === "trap_active"
      ) {
        done_anything = true;
        triggered_tiles.push([r - 1, c]);
      }
      if (
        !triggeredTileCoordStrings.includes(String([r, c - 1])) &&
        c >= 1 &&
        board[r]![c - 1]! === "trap_active"
      ) {
        done_anything = true;
        triggered_tiles.push([r, c - 1]);
      }
      if (
        !triggeredTileCoordStrings.includes(String([r + 1, c])) &&
        r <= 4 &&
        board[r + 1]![c]! === "trap_active"
      ) {
        done_anything = true;
        triggered_tiles.push([r + 1, c]);
      }
      if (
        !triggeredTileCoordStrings.includes(String([r, c + 1])) &&
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
  for (const coord of triggered_tiles) {
    newBoard = setCell(newBoard, coord[0], coord[1], "empty");
  }

  // All done!
  return newBoard;
}

// Triggers the first watcher it encounters. If it doesn't encounter one, does nothing.
function triggerWatcher(entities: EntityGrid): EntityGrid {
  // Deep copy the array so we don't mutate the original
  for (let i = 0; i < 6; i++) {
    for (let i2 = 0; i2 < 6; i2++) {
      if (entities[i]![i2]! === "watcher_inactive") {
        return setEntity(entities, i, i2, "watcher_active");
      }
    }
  }
  return entities;
}

// Monster detection.
export function anyHands(ent: EntityGrid): boolean {
  for (let i = 0; i < 6; i++) {
    for (let i2 = 0; i2 < 6; i2++) {
      if (getEntity(ent, i, i2) === "hand") {
        return true;
      }
    }
  }
  return false;
}

export function anyBeavers(ent: EntityGrid): boolean {
  for (let i = 0; i < 6; i++) {
    for (let i2 = 0; i2 < 6; i2++) {
      if (getEntity(ent, i, i2) === "beaver") {
        return true;
      }
    }
  }
  return false;
}

export function anyMimics(ent: EntityGrid): boolean {
  for (let i = 0; i < 6; i++) {
    for (let i2 = 0; i2 < 6; i2++) {
      if (getEntity(ent, i, i2) === "mimic") {
        return true;
      }
    }
  }
  return false;
}

export function anyBeaversOrMimics(ent: EntityGrid): boolean {
  for (let i = 0; i < 6; i++) {
    for (let i2 = 0; i2 < 6; i2++) {
      if (
        getEntity(ent, i, i2) === "beaver" ||
        getEntity(ent, i, i2) === "mimic"
      ) {
        return true;
      }
    }
  }
  return false;
}

// Removes any and all monster statues if there are no monsters.
export function disperseMonsterStatues(entities: EntityGrid): EntityGrid {
  let newEntities = entities.map((row) => row.map((v) => v)) as EntityGrid;
  if (!anyHands(entities)) {
    for (let i = 0; i < 6; i++) {
      for (let i2 = 0; i2 < 6; i2++) {
        if (getEntity(entities, i, i2) === "monster_statue") {
          newEntities[i]![i2]! = "empty";
        }
      }
    }
  }
  return newEntities;
}

// Big function for the entity-moving step.
function moveEntities(board: Board, entities: EntityGrid, activeWings: boolean, player_row: number, player_col: number, action: Action): [Board, EntityGrid, boolean] | string {
  // Search loop: only works for one enemy per brane. Luckily that's exactly our use case.
  for (let i = 0; i < 6; i++) {
    for (let i2 = 0; i2 < 6; i2++) {
      // Move mimic
      if (action !== "staff" && getEntity(entities, i, i2) === "mimic") {
        // Mimic facing direction doesn't matter since they can't interact. //
        const { dr, dc } = DELTAS[action];
        const mimic_target_r = i + dr;
        const mimic_target_c = i2 - dc; // this is where the flipping happens!

        // Check if the mimic is hitting OOB, wall, or chest. Because facing direction doesn't matter, this is a no-op for the mimic.
        if (
          !inBounds(mimic_target_r, mimic_target_c) ||
          getCell(board, mimic_target_r, mimic_target_c) === "wall" ||
          getEntity(entities, mimic_target_r, mimic_target_c) === "chest"
        ) {
          return [board,entities,activeWings];
        }
        // Hit the player, DIE.
        else if (player_row === mimic_target_r && player_col === mimic_target_c) {
          // Throw player down the pit.
          if (getCell(board, player_row, player_col) === "empty") {
            return [board,entities,false];
          } else {
            return "death"; // death!
          }
        }
        // Pushing a rock.
        else if (getEntity(entities, mimic_target_r, mimic_target_c) === "rock" || getEntity(entities, mimic_target_r, mimic_target_c) === "watcher_inactive" || getEntity(entities, mimic_target_r, mimic_target_c) === "watcher_active" || getEntity(entities, mimic_target_r, mimic_target_c) === "monster_statue") {
          const rockDestRow = i + dr*2;
          const rockDestCol = i2 - dc*2;
          
          const startingEntity = getEntity(entities, mimic_target_r, mimic_target_r);

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
            return [board,entities,activeWings];
          }
          // Break any glass the rock was pushed off of.
          let newBoard =
            getCell(board, mimic_target_r, mimic_target_r) === "glass" ?
              setCell(board, mimic_target_r, mimic_target_r, "empty")
            : board;
          let newEntities = entities;

          // Pushing into void.
          if (getCell(newBoard, rockDestRow, rockDestCol) === "empty") {
            newEntities = setEntity(
              setEntity(newEntities, mimic_target_r, mimic_target_r, "empty"),
              rockDestRow,
              rockDestCol,
              "empty",
            );
          }
          // UNNECESSARY TRAP TILE CODE
          // Normal move
          else {
            newEntities = setEntity(
              setEntity(newEntities, mimic_target_r, mimic_target_r, "empty"),
              rockDestRow,
              rockDestCol,
              startingEntity,
            );
          }
          
          return [newBoard, newEntities, activeWings];
        }
        // Pushing something else??
        else if (getEntity(entities, mimic_target_r, mimic_target_c) !== "empty") {
          throw new Error("unrecognized entity: "+String(getEntity(entities, mimic_target_r, mimic_target_c)));
        }
        // Standard movement.
        else {
          let newEntities = entities;

          // Break glass.
          let newBoard =
            getCell(board, i, i2) === "glass" ?
              setCell(board, i, i2, "empty")
            : board;

          // Moving into empty space.
          const movingToCell = getCell(board, mimic_target_r, mimic_target_c);
          if (movingToCell === "empty") {
            newEntities = setEntity(newEntities, i, i2, "empty");
          }
          // Moving onto inactive trap
          else if (movingToCell === "trap_inactive") {
            newEntities = setEntity(setEntity(newEntities, i, i2, "empty"), mimic_target_r, mimic_target_c, "mimic");
            newBoard = setCell(newBoard, mimic_target_r, mimic_target_c, "trap_active");
          }
          // Moving onto ACTIVE trap
          else if (movingToCell === "trap_active") {
            newEntities = setEntity(newEntities, i, i2, "empty");
            newBoard = disperseTraps(newBoard, mimic_target_r, mimic_target_c);
          }
          // Normal Move
          else {
            newEntities = setEntity(setEntity(newEntities, i, i2, "empty"), mimic_target_r, mimic_target_c, "mimic");
          }
          
          return [newBoard, newEntities, activeWings];
        }
      }
    }
  }

  return [board, entities, activeWings];
}

export function applyAction(
  state: GameState,
  action: Action,
  burdens: Burdens,
): GameState | null {
  const { board, entities, player } = state;
  const { row, col, facing, staffContent } = player;
  const wingsActive = burdens.wings && (player.wingsActive ?? false);
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
      // Move entities
      if (anyBeaversOrMimics(entities)) {
        const statesAfterEntities = moveEntities(board, entities, wingsActive, row, col, action);
        
        if (typeof statesAfterEntities === "string") {
          return null
        }

        return {
          board: statesAfterEntities[0]!,
          entities: statesAfterEntities[1]!,
          player: {
            row,
            col,
            facing: action,
            staffContent,
            wingsActive: false, // Bumping always disables
          },
        };
      }
      // Return null if unchanged.
      else if (facing === action && wingsActive === false) {
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

    // Moving into an enemy
    if (
      getEntity(entities, newRow, newCol) === "beaver" ||
      getEntity(entities, newRow, newCol) === "mimic" ||
      getEntity(entities, newRow, newCol) === "hand"
    ) {
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
          
        // Move entities
        if (anyBeaversOrMimics(entities)) {
          const statesAfterEntities = moveEntities(newBoard, entities, wingsActive, row, col, action);
            
          if (typeof statesAfterEntities === "string") {
            return null
          }

          return {
            board: statesAfterEntities[0]!,
            entities: statesAfterEntities[1]!,
            player: {
              row,
              col,
              facing: action,
              staffContent,
              wingsActive: statesAfterEntities[2]!,
            },
          };
        }

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
      const startingEntity = getEntity(entities, newRow, newCol);

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
        
        // Move entities
        if (anyBeaversOrMimics(entities)) {
          const statesAfterEntities = moveEntities(board, entities, wingsActive, row, col, action);
        
          if (typeof statesAfterEntities === "string") {
            return null
          }

          return {
            board: statesAfterEntities[0]!,
            entities: statesAfterEntities[1]!,
            player: {
              row,
              col,
              facing: action,
              staffContent,
              wingsActive: false, // Bumping always disables
            },
          };
        }
        
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
          startingEntity,
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
          startingEntity,
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
          startingEntity,
        );
      }
      
      // Move entities
      if (anyBeaversOrMimics(newEntities)) {
        const statesAfterEntities = moveEntities(newBoard, disperseMonsterStatues(newEntities), wingsActive, row, col, action);
        
        if (typeof statesAfterEntities === "string") {
          return null
        }

        return {
          board: statesAfterEntities[0]!,
          entities: disperseMonsterStatues(statesAfterEntities[1]!),
          player: {
            row,
            col,
            facing: action,
            staffContent,
            wingsActive: false, // always false after a push
          },
        };
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
      
      // Move entities
      if (anyBeaversOrMimics(newEntities)) {
        const statesAfterEntities = moveEntities(newBoard, newEntities, wingsActive, row, col, action);
        
        if (typeof statesAfterEntities === "string") {
          return null
        }

        return {
          board: statesAfterEntities[0]!,
          entities: disperseMonsterStatues(statesAfterEntities[1]!),
          player: {
            row: newRow,
            col: newCol,
            facing: action,
            staffContent,
            wingsActive: false,
          },
        };
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
        burdens.wings && getCell(newBoard, newRow, newCol) === "empty";
        
      // Move entities
      if (anyBeaversOrMimics(newEntities)) {
        const statesAfterEntities = moveEntities(newBoard, newEntities, newWingsActive, row, col, action);
        
        if (typeof statesAfterEntities === "string") {
          return null
        }

        return {
          board: statesAfterEntities[0]!,
          entities: disperseMonsterStatues(statesAfterEntities[1]!),
          player: {
            row: newRow,
            col: newCol,
            facing: action,
            staffContent,
            wingsActive: statesAfterEntities[2]!,
          },
        };
      }

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
    return cell === "stairs";
  } else if (target === "empty") {
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
  // console.debug(
  //   state.board.map((row, r) =>
  //     row.map((cell, c) => cellMatchesTarget(cell, getCell(target, r, c))),
  //   ),
  // );
  return state.board.every((row, r) =>
    row.every((cell, c) => cellMatchesTarget(cell, getCell(target, r, c))),
  );
}

export function replayPath(
  initial: GameState,
  path: Action[],
  target: Board,
  burdens: Burdens = NO_BURDENS,
  requireFinalJump = true,
): void {
  console.log("\n--- Solution replay ---");
  let state = initial;
  console.log(`\nStep 0 (initial):\n${renderState(state)}\n`);
  for (let i = 0; i < path.length; i++) {
    const action = path[i]!;
    state = applyAction(state, action, burdens)!;
    if (!state) {
      console.log(
        `Step ${i + 1}: ${action} | h: Invalid state\n${renderState(state)}\n`,
      );
      break;
    }
    console.log(
      `Step ${i + 1}: ${action} | h: ${
        heuristic(state, target, requireFinalJump).total
      }\n${renderState(state)}\n`,
    );
    if (isGoal(state, target, requireFinalJump)) {
      console.log("Goal reached!");
      console.log(`${actionsToString(path)} - length ${path.length}`);
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
      floorChar = "◖◗";
      break;
    case "trap_active":
      floorChar = "<>";
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

export function renderStates(states: GameState[]): string {
  let str = "";
  for (const state of states) {
    str += renderState(state);
  }
  return str;
}

export function renderState(state: GameState, requiredTiles?: number): string {
  if (!state) {
    return `
┌────────────┐
│            │
│            │
│  invalid   │
│   state    │
│            │
│            │
└────────────┘
`;
  }
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

// TODO: Rename this to renderBoard and above to renderState, and DRY them out
export function renderBoard(board: Board): string {
  const cellChar = (cell: Cell, r: number, c: number): string => {
    return renderCellFloor(cell);
  };
  const rows = board.map(
    (row, r) => "│" + row.map((cell, c) => cellChar(cell, r, c)).join("") + "│",
  );
  return ["┌────────────┐", ...rows, "└────────────┘"].join("\n");
}