import { renderState, renderStates, applyAction } from "./gameState";
import { NO_BURDENS } from "./types";
import type {
  Action,
  Burdens,
  PlayerState,
  GameState,
  Cell,
  Board,
  Entity,
  EntityGrid,
} from "./types";

let VERBOSE = Number(process.env.VERBOSE);

const PATH_CHARS: Record<string, Action> = {
  U: "up",
  D: "down",
  L: "left",
  R: "right",
  Z: "staff",
};

const ACTION_CHARS: Record<Action, string> = {
  up: "U",
  down: "D",
  left: "L",
  right: "R",
  staff: "Z",
};
const ACTION_STRINGS: Record<string, Action> = Object.fromEntries(
  Object.entries(ACTION_CHARS).map(([s, c]) => [c, s as Action]),
);

/** Converts a list of actions back to the compact path string. Inverse of applyPath's input. */
export function actionsToString(actions: Action[]): string {
  return actions.map((a) => ACTION_CHARS[a]).join("");
}

export function parseActions(actionString: string): Action[] {
  return actionString.split("").map((c) => ACTION_STRINGS[c]!);
}

/**
 * Applies a compact path string to an initial board state and returns the
 * resulting GameState after each step.
 *
 * Path characters: U=up  D=down  L=left  R=right  Z=staff (use staff)
 *
 * Throws if a character is unrecognised or the resulting action is invalid
 * (e.g. moving into a wall), so call-site mistakes surface immediately.
 */

export function applyPath(
  initial: { board: Board; entities?: EntityGrid; player: PlayerState },
  pathStr: string,
  burdens: Burdens = NO_BURDENS,
): GameState[] {
  let state: GameState = {
    board: initial.board,
    entities: initial.entities ?? emptyEntityGrid(),
    player: initial.player,
  };
  const states: GameState[] = [state];

  for (let i = 0; i < pathStr.length; i++) {
    if (VERBOSE >= 2) console.log(renderState(state));
    const char = pathStr[i]!;
    const action = PATH_CHARS[char];
    if (!action)
      throw new Error(`Unknown path character "${char}" at index ${i}`);
    const next = applyAction(state, action, burdens);
    if (!next) {
      throw new Error(
        `Invalid action "${action}" (${char}) at step ${i + 1} — move blocked` +
          renderStates(states),
      );
    }
    states.push(next);
    state = next;
  }

  if (VERBOSE >= 2) console.log(renderState(state));

  return states;
}
const CELL_CHARS: Record<Cell, string> = {
  empty: " ",
  floor: "#",
  glass: "G",
  stairs: "S",
  wall: "W",
  button: "B",
  trap_inactive: "T",
  trap_active: "A",
};
const ENTITY_CHARS: Record<Entity, string> = {
  empty: " ",
  rock: "R",
  beaver: "B",
  mimic: "M",
  hand: "H",
  watcher_inactive: "W",
  watcher_active: "!",
  chest: "C",
  monster_statue: "~",
  maggot_up: "A",
  leech_left: "L",
  maggot_down: "Ä",
  leech_right: "Ꞁ",
};
/** Converts a Board back to the compact string-array notation used in levels.ts. */

export function boardToStrings(board: Board): string[] {
  return board.map((row) => row.map((cell) => CELL_CHARS[cell]).join(""));
}
export function entitiesToStrings(entities: EntityGrid): string[] {
  return entities.map((row) => row.map((cell) => ENTITY_CHARS[cell]).join(""));
}

export function parseBoard(rows: string[]): Board {
  const charToCell: Record<string, Cell> = {
    " ": "empty",
    "#": "floor",
    G: "glass",
    S: "stairs",
    W: "wall",
    B: "button",
    T: "trap_inactive",
    A: "trap_active",
  };
  return rows.map((row) =>
    Array.from(row).map((ch) => {
      const cell = charToCell[ch];
      if (cell === undefined)
        throw new Error(`Unknown tile character: "${ch}"`);
      return cell;
    }),
  );
}

export function parseEntities(rows: string[]): EntityGrid {
  const charToEntity: Record<string, Entity> = {
    " ": "empty",
    R: "rock",
    B: "beaver",
    M: "mimic",
    H: "hand",
    W: "watcher_inactive",
    "!": "watcher_active",
    C: "chest",
    "~": "monster_statue",
    A: "maggot_up",
    L: "leech_left",
    Ä: "maggot_down",
    Ꞁ: "leech_right",
  };
  return rows.map((row) =>
    Array.from(row).map((ch) => {
      const entity = charToEntity[ch];
      if (entity === undefined)
        throw new Error(`Unknown entity character: "${ch}"`);
      return entity;
    }),
  );
}
/** Returns a 6×6 entity grid with no entities. */

export function emptyEntityGrid(): EntityGrid {
  return Array.from({ length: 6 }, () => Array<Entity>(6).fill("empty"));
}
