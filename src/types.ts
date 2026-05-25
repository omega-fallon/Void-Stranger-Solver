export type Direction = "up" | "down" | "left" | "right";
export type Action = "up" | "down" | "left" | "right" | "staff";

// "empty" = void, "floor" = walkable floor, "glass" = walkable but breaks when stepped off, "stairs" = the stairs, "wall" = impassable and immovable
export type Cell = "empty" | "floor" | "glass" | "stairs" | "wall" | "button" | "trap_inactive" | "trap_active";

// [row][col], row 0 = top row, col 0 = left column
export type Board = Cell[][];

// Staff can hold nothing, a floor, a glass, or the stairs
export type StaffContent = "empty" | "floor" | "glass" | "stairs" | "button" | "trap_inactive" | "trap_active";

export interface PlayerState {
  row: number;
  col: number;
  facing: Direction;
  staffContent: StaffContent;
}

export interface GameState {
  board: Board;
  player: PlayerState;
}

export interface SearchNode {
  state: GameState;
  gCost: number;
  hCost: number;
  action: Action | null;
  parent: SearchNode | null;
}
