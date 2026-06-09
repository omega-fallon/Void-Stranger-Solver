export type Direction = "up" | "down" | "left" | "right";

/** Indicates which Burdens the player has active */
export interface Burdens {
  wings: boolean;
  sword: boolean;
  endless: boolean;
}

export const NO_BURDENS: Burdens = { wings: false, sword: false, endless: false };
export type Action = "up" | "down" | "left" | "right" | "staff";

// "empty" = void, "floor" = walkable floor, "glass" = walkable but breaks when stepped off, "stairs" = the stairs, "wall" = impassable and immovable
export type Cell =
  | "empty"
  | "floor"
  | "glass"
  | "stairs"
  | "wall"
  | "button"
  | "trap_inactive"
  | "trap_active";

// [row][col], row 0 = top row, col 0 = left column
export type Board = Cell[][];

// Entity layer — overlaid on the board, tracks objects/enemies
export type Entity =
  | "empty"
  | "rock"
  | "beaver"
  | "mimic"
  | "hand"
  | "watcher_inactive"
  | "watcher_active"
  | "chest"
  | "monster_statue"
  | "maggot"
  | "leech"
  | "maggot_stopped"
  | "leech_stopped";
export type EntityGrid = Entity[][];

// Staff can hold nothing, a floor, a glass, or the stairs
export type StaffContent =
  | "empty"
  | "floor"
  | "glass"
  | "stairs"
  | "button"
  | "trap_inactive"
  | "trap_active";

export interface PlayerState {
  row: number;
  col: number;
  facing: Direction;
  staffContent: StaffContent;
  /** True while the player is gliding over the void using the wings burden. */
  wingsActive?: boolean;
}

export interface GameState {
  board: Board;
  entities: EntityGrid;
  player: PlayerState;
}

export interface SearchNode {
  state: GameState;
  gCost: number;
  hCost: number;
  action: Action | null;
  parent: SearchNode | null;
}
