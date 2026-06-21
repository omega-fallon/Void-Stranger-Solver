import { heuristic } from "./heuristic";
import { countFloorTiles, floorInStaff } from "./search";
import { NO_BURDENS, PlayerState } from "./types";
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

// Given a PlayerState, returns the index of the tile the player is facing. THIS CAN RETURN OOB COORDINATES!
export function facedTile(player: PlayerState): [number, number] {
  const { dr, dc } = DELTAS[player.facing];
  return [player.row + dr, player.col + dc];
}

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

export function anyMovers(ent: EntityGrid): boolean {
  for (let i = 0; i < 6; i++) {
    for (let i2 = 0; i2 < 6; i2++) {
      if (
        getEntity(ent, i, i2) === "beaver" ||
        getEntity(ent, i, i2) === "mimic" ||
        getEntity(ent, i, i2) === "maggot_up" ||
        getEntity(ent, i, i2) === "maggot_down" ||
        getEntity(ent, i, i2) === "leech_left" ||
        getEntity(ent, i, i2) === "leech_right"
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
  if (!anyHands(entities) && !anyMovers(entities)) {
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
function moveEntities(
  board: Board,
  entities: EntityGrid,
  activeWings: boolean,
  hasWings: boolean,
  player_row: number,
  player_col: number,
  action: Action,
): [Board, EntityGrid, boolean] | string {
  // Search loop: find the monsters. In the case of mimic and beaver we can skip the second part and just immediately return since they're singlets.
  const maggots_and_leeches = [
    "maggot_up",
    "maggot_down",
    "leech_left",
    "leech_right",
  ];
  let to_move: [number, number][] = [];

  for (let i = 0; i < 6; i++) {
    for (let i2 = 0; i2 < 6; i2++) {
      // Move maggot & leech
      if (maggots_and_leeches.includes(getEntity(entities, i, i2))) {
        to_move.push([i, i2]);
      }
      // Move mimic
      else if (action !== "staff" && getEntity(entities, i, i2) === "mimic") {
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
          return [board, entities, activeWings];
        }
        // Hit the player, DIE.
        else if (
          player_row === mimic_target_r &&
          player_col === mimic_target_c
        ) {
          // Throw player down the pit.
          if (getCell(board, player_row, player_col) === "empty") {
            return [board, entities, false];
          } else {
            return "death"; // death!
          }
        }
        // Pushing a rock.
        else if (
          getEntity(entities, mimic_target_r, mimic_target_c) === "rock" ||
          getEntity(entities, mimic_target_r, mimic_target_c) ===
            "watcher_inactive" ||
          getEntity(entities, mimic_target_r, mimic_target_c) ===
            "watcher_active" ||
          getEntity(entities, mimic_target_r, mimic_target_c) ===
            "monster_statue"
        ) {
          const rockDestRow = i + dr * 2;
          const rockDestCol = i2 - dc * 2;

          const startingEntity = getEntity(
            entities,
            mimic_target_r,
            mimic_target_r,
          );

          // If any of these things are true, we push but nothing happens, equivalent to hitting a wall.
          if (
            !inBounds(rockDestRow, rockDestCol) ||
            getCell(board, rockDestRow, rockDestCol) === "wall" ||
            getEntity(entities, rockDestRow, rockDestCol) === "rock" ||
            getEntity(entities, rockDestRow, rockDestCol) ===
              "watcher_inactive" ||
            getEntity(entities, rockDestRow, rockDestCol) ===
              "watcher_active" ||
            getEntity(entities, rockDestRow, rockDestCol) === "chest" ||
            getEntity(entities, rockDestRow, rockDestCol) === "monster_statue"
          ) {
            return [board, entities, activeWings];
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
        else if (
          getEntity(entities, mimic_target_r, mimic_target_c) !== "empty"
        ) {
          throw new Error(
            "unrecognized entity: " +
              String(getEntity(entities, mimic_target_r, mimic_target_c)),
          );
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
            newEntities = setEntity(
              setEntity(newEntities, i, i2, "empty"),
              mimic_target_r,
              mimic_target_c,
              "mimic",
            );
            newBoard = setCell(
              newBoard,
              mimic_target_r,
              mimic_target_c,
              "trap_active",
            );
          }
          // Moving onto ACTIVE trap
          else if (movingToCell === "trap_active") {
            newEntities = setEntity(newEntities, i, i2, "empty");
            newBoard = disperseTraps(newBoard, mimic_target_r, mimic_target_c);
          }
          // Normal Move
          else {
            newEntities = setEntity(
              setEntity(newEntities, i, i2, "empty"),
              mimic_target_r,
              mimic_target_c,
              "mimic",
            );
          }

          return [newBoard, newEntities, activeWings];
        }
      }
    }
  }

  // Move leeches and maggots
  if (to_move.length < 1) {
    const blockers = [
      "rock",
      "watcher_inactive",
      "watcher_active",
      "chest",
      "maggot_up",
      "maggot_down",
      "leech_left",
      "leech_right",
    ];
    const unmoveables = ["empty", "wall"];

    let newEntityPositions: [number, number, Entity][] = [];
    let playerHit = false;

    for (const coord of to_move) {
      if (getEntity(entities, coord[0], coord[1]) === "maggot_up") {
        // Player is there
        if (player_col === coord[0] - 1 && player_row === coord[1]) {
          playerHit = true;
        }

        // Blocked
        if (
          !inBounds(coord[0] - 1, coord[1]) ||
          blockers.includes(getEntity(entities, coord[0] - 1, coord[1])) ||
          unmoveables.includes(getCell(board, coord[0] - 1, coord[1]))
        ) {
          entities = setEntity(entities, coord[0], coord[1], "maggot_down");
        }
        // Continue
        else {
          board =
            getCell(board, coord[0], coord[1]) === "glass" ?
              setCell(board, coord[0], coord[1], "empty")
            : board;
          entities = setEntity(entities, coord[0], coord[1], "empty");
          newEntityPositions.push([coord[0] - 1, coord[1], "maggot_up"]);
        }
      } else if (getEntity(entities, coord[0], coord[1]) === "maggot_down") {
        // Player is there
        if (player_col === coord[0] + 1 && player_row === coord[1]) {
          playerHit = true;
        }

        // Blocked
        if (
          !inBounds(coord[0] + 1, coord[1]) ||
          blockers.includes(getEntity(entities, coord[0] + 1, coord[1])) ||
          unmoveables.includes(getCell(board, coord[0] + 1, coord[1]))
        ) {
          entities = setEntity(entities, coord[0], coord[1], "maggot_up");
        }
        // Continue
        else {
          board =
            getCell(board, coord[0], coord[1]) === "glass" ?
              setCell(board, coord[0], coord[1], "empty")
            : board;
          entities = setEntity(entities, coord[0], coord[1], "empty");
          newEntityPositions.push([coord[0] + 1, coord[1], "maggot_down"]);
        }
      } else if (getEntity(entities, coord[0], coord[1]) === "leech_left") {
        // Player is there
        if (player_col === coord[0] && player_row - 1 === coord[1]) {
          playerHit = true;
        }

        // Blocked
        if (
          !inBounds(coord[0], coord[1] - 1) ||
          blockers.includes(getEntity(entities, coord[0], coord[1] - 1)) ||
          unmoveables.includes(getCell(board, coord[0], coord[1] - 1))
        ) {
          entities = setEntity(entities, coord[0], coord[1], "leech_right");
        }
        // Continue
        else {
          board =
            getCell(board, coord[0], coord[1]) === "glass" ?
              setCell(board, coord[0], coord[1], "empty")
            : board;
          entities = setEntity(entities, coord[0], coord[1], "empty");
          newEntityPositions.push([coord[0], coord[1] - 1, "leech_left"]);
        }
      } else if (getEntity(entities, coord[0], coord[1]) === "leech_right") {
        // Player is there
        if (player_col === coord[0] && player_row + 1 === coord[1]) {
          playerHit = true;
        }

        // Blocked
        if (
          !inBounds(coord[0], coord[1] + 1) ||
          blockers.includes(getEntity(entities, coord[0], coord[1] + 1)) ||
          unmoveables.includes(getCell(board, coord[0], coord[1] + 1))
        ) {
          entities = setEntity(entities, coord[0], coord[1], "leech_left");
        }
        // Continue
        else {
          board =
            getCell(board, coord[0], coord[1]) === "glass" ?
              setCell(board, coord[0], coord[1], "empty")
            : board;
          entities = setEntity(entities, coord[0], coord[1], "empty");
          newEntityPositions.push([coord[0], coord[1] + 1, "leech_right"]);
        }
      }
    }

    // Begin moving
    if (newEntityPositions.length > 2) {
      throw new Error("moveEntity found more than two movers");
    } else if (newEntityPositions.length > 0) {
      if (newEntityPositions.length === 2) {
        // Check for collision; if so we've already removed them from the board, return nothing.
        if (
          newEntityPositions[0]![0]! === newEntityPositions[1]![0]! &&
          newEntityPositions[0]![1]! === newEntityPositions[1]![1]!
        ) {
          return [board, entities, activeWings];
        }
        // Otherwise, place in accordance to newEntityPositions
        else {
          let delayedTrapDisperse: [number, number][] = [];
          // Place
          for (const entityPosition of newEntityPositions) {
            // Onto an inactive trap; activate the trap
            if (
              getCell(board, entityPosition[0], entityPosition[1]) ===
              "trap_inactive"
            ) {
              board = setCell(
                board,
                entityPosition[0],
                entityPosition[1],
                "trap_active",
              );
            }
            // Onto an active trap; mark a dispersal needing to be triggered.
            else if (
              getCell(board, entityPosition[0], entityPosition[1]) ===
              "trap_active"
            ) {
              delayedTrapDisperse.push([entityPosition[0], entityPosition[1]]);
            }
            entities = setEntity(
              entities,
              entityPosition[0],
              entityPosition[1],
              entityPosition[2],
            );
          }

          // Disperse traps.
          for (const trapSource of delayedTrapDisperse) {
            // Check to make sure previous pass didn't eliminate it already.
            if (
              getCell(board, trapSource[0], trapSource[1]) === "trap_active"
            ) {
              board = disperseTraps(board, trapSource[0], trapSource[1]);
            }
          }

          // Drop floaters
          entities = checkFallen(board, entities);

          // Throw player down the pit.
          if (playerHit) {
            if (getCell(board, player_row, player_col) === "empty") {
              return [board, entities, false];
            } else {
              return "death"; // death!
            }
          }
          // PLayer got floor taken out from underneath them.
          else if (getCell(board, player_row, player_col) === "empty") {
            // unsure how this case is handled in-game
            if (activeWings) {
              throw new Error("unaccounted situation occurred in moveEntities");
            }
            // wings activate
            else if (hasWings) {
              return [board, entities, true];
            }
            // no wings to activate
            else {
              return [board, entities, false];
            }
          }

          return [board, entities, activeWings];
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
      if (anyMovers(entities)) {
        const statesAfterEntities = moveEntities(
          board,
          entities,
          wingsActive,
          burdens.wings,
          row,
          col,
          action,
        );

        if (typeof statesAfterEntities === "string") {
          return null;
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
      getEntity(entities, newRow, newCol) === "hand" ||
      getEntity(entities, newRow, newCol) === "maggot_up" ||
      getEntity(entities, newRow, newCol) === "leech_left" ||
      getEntity(entities, newRow, newCol) === "maggot_down" ||
      getEntity(entities, newRow, newCol) === "leech_right"
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
        if (anyMovers(entities)) {
          const statesAfterEntities = moveEntities(
            newBoard,
            entities,
            wingsActive,
            burdens.wings,
            row,
            col,
            action,
          );

          if (typeof statesAfterEntities === "string") {
            return null;
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
        if (anyMovers(entities)) {
          const statesAfterEntities = moveEntities(
            board,
            entities,
            wingsActive,
            burdens.wings,
            row,
            col,
            action,
          );

          if (typeof statesAfterEntities === "string") {
            return null;
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
      if (anyMovers(newEntities)) {
        const statesAfterEntities = moveEntities(
          newBoard,
          disperseMonsterStatues(newEntities),
          wingsActive,
          burdens.wings,
          row,
          col,
          action,
        );

        if (typeof statesAfterEntities === "string") {
          return null;
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
      if (anyMovers(newEntities)) {
        const statesAfterEntities = moveEntities(
          newBoard,
          newEntities,
          wingsActive,
          burdens.wings,
          row,
          col,
          action,
        );

        if (typeof statesAfterEntities === "string") {
          return null;
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
      if (anyMovers(newEntities)) {
        const statesAfterEntities = moveEntities(
          newBoard,
          newEntities,
          newWingsActive,
          burdens.wings,
          row,
          col,
          action,
        );

        if (typeof statesAfterEntities === "string") {
          return null;
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
  }
  // ── Staff action — player does not move; wingsActive passes through unchanged ─
  else {
    const { dr, dc } = DELTAS[facing];
    const fr = row + dr;
    const fc = col + dc;
    if (!inBounds(fr, fc)) return null;

    const front = getCell(board, fr, fc);

    // Chest and upwards? (no need for enemy movement, chests do not overlap with them)
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
    // Check for other entities in front cell. Either kill with sword or return null
    else if (getEntity(entities, fr, fc) !== "empty") {
      // She's got a sword!
      if (
        burdens.sword &&
        [
          "hand",
          "beaver",
          "mimic",
          "maggot_up",
          "maggot_down",
          "leech_left",
          "leech_right",
        ].includes(getEntity(entities, fr, fc))
      ) {
        // If hand on glass, remove glass.
        const newBoard =
          (
            getEntity(entities, fr, fc) === "hand" &&
            getCell(board, fr, fc) === "glass"
          ) ?
            setCell(board, fr, fc, "empty")
          : board;

        // Delete entity.
        const newEntities = setEntity(entities, fr, fc, "empty");

        // Move entities
        if (anyMovers(entities)) {
          const statesAfterEntities = moveEntities(
            newBoard,
            newEntities,
            wingsActive,
            burdens.wings,
            player.row,
            player.col,
            action,
          );

          if (typeof statesAfterEntities === "string") {
            return null;
          }

          return {
            board: statesAfterEntities[0],
            entities: disperseMonsterStatues(statesAfterEntities[1]),
            player: {
              row,
              col,
              facing,
              staffContent,
              wingsActive: statesAfterEntities[2],
            },
          };
        }
        // No entities to move
        else {
          return {
            board: newBoard,
            entities: newEntities,
            player: {
              row,
              col,
              facing,
              staffContent,
              wingsActive: player.wingsActive ?? false,
            },
          };
        }
      } else {
        return null;
      }
    }
    // Using the Void Rod
    else {
      // Create newEntities by trigger watchers. In the case that we hit the ELSE block below, doing this won't matter at all since we return null anyways.
      const newEntities = triggerWatcher(entities);

      function staffCanTake(staffContent: StaffContent[]): boolean {
        return burdens.endless || staffContent.length === 0;
      }

      // Taking
      if (staffCanTake(staffContent) && front !== "empty" && front !== "wall") {
        return {
          board: setCell(board, fr, fc, "empty"),
          entities: disperseMonsterStatues(newEntities),
          player: {
            row,
            col,
            facing,
            staffContent: [...staffContent, front],
            wingsActive: player.wingsActive ?? false,
          },
        };
      }
      // Placing
      else if (staffContent.length > 0 && front === "empty") {
        return {
          board: setCell(board, fr, fc, staffContent[staffContent.length - 1]!),
          entities: disperseMonsterStatues(newEntities),
          player: {
            row,
            col,
            facing,
            staffContent: staffContent.slice(0, staffContent.length - 1),
            wingsActive: player.wingsActive ?? false,
          },
        };
      }
      // Unable to use Void Rod
      else {
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
    if (staffContent.length === 0) {
      return "e";
    }

    let str = "";

    for (const x of staffContent) {
      str +=
        x === "floor" ? "f"
        : x === "glass" ? "g"
        : x === "button" ? "b"
        : x === "trap_inactive" ? "t"
        : x === "trap_active" ? "a"
        : "s";
    }
    return str;
  })();
  const wingsStr = wingsActive ? "W" : "0";
  // "so burdens aren't kept as part of the state bc they don't change in a run, so we don't need to store a lot of copies of them"
  return (function combineString() {
    return `${boardStr}|${entityStr}|${row},${col},${facing},${staffStr},${wingsStr}`;
  })();
}

// Non-(empty or stairs) are interchangeable for goal satisfaction — the brand only
// requires "solid tile present" or "empty", not a specific solid type.
export function cellMatchesTarget(cell: Cell, target: Cell): boolean {
  if (cell === "stairs") {
    return false;
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
    if (!state.player.staffContent.includes("stairs")) return false;
    if (getCell(state.board, state.player.row, state.player.col) !== "empty")
      return false;
    if (state.player.wingsActive) return false;
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
        heuristic(state, target, requireFinalJump, burdens).total
      }\n${renderState(state)}\n`,
    );
    if (isGoal(state, target, requireFinalJump)) {
      console.log("Goal reached!");
      console.log(`${actionsToString(path)} - length ${path.length}`);
    }
  }
}

function renderStaffContent(staffContent: StaffContent[]): string {
  if (staffContent.length === 0) {
    return "";
  }

  let str = "";
  for (const x of staffContent) {
    str += renderCellFloor(x as string);
  }
  return str;
}

function renderCellFloor(cell: string): string {
  switch (cell) {
    case "floor":
      return "██";
    case "glass":
      return "░░";
    case "stairs":
      return "S ";
    case "wall":
      return "▓▓";
    case "button":
      return "█B";
    case "trap_inactive":
      return "◖◗";
    case "trap_active":
      return "<>";
    case "empty":
      return "  ";
    default:
      return cell;
  }
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
    } else if (entities[r]?.[c] === "maggot_up") {
      overlayChar = "A";
    } else if (entities[r]?.[c] === "leech_left") {
      overlayChar = "L";
    } else if (entities[r]?.[c] === "maggot_down") {
      overlayChar = "Ɐ";
    } else if (entities[r]?.[c] === "leech_right") {
      overlayChar = "Ꞁ";
    }
    const floorChar = renderCellFloor(cell);
    return overlayChar ? overlayChar + floorChar.slice(1) : floorChar;
  };

  for (const row of board) {
    if (row.length !== 6) {
      throw new Error(
        "Invalid length row of " +
          String(row.length) +
          " printing: " +
          String(row),
      );
    }
  }

  const rows = board.map(
    (row, r) => "│" + row.map((cell, c) => cellChar(cell, r, c)).join("") + "│",
  );
  const numFloorTilesRemaining =
    countFloorTiles(board) + floorInStaff(state.player.staffContent);
  const wingsIndicator = state.player.wingsActive ? " 🦋" : "";
  //const swordIndicator = state.player.swordActive ? " 🗡️" : "";
  //const endlessIndicator = state.player.endlessActive ? " 🪄" : "";
  return (
    `${numFloorTilesRemaining} floor tiles remain${
      requiredTiles ? ` out of a necessary ${requiredTiles}` : ""
    }\n` +
    ["┌────────────┐", ...rows, "└────────────┘"].join("\n") +
    `\nstaff: [${renderStaffContent(
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
