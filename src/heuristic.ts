import type { Board, Cell, GameState } from "./types";
import { staffBanned } from "./search";

function manhattan(r1: number, c1: number, r2: number, c2: number): number {
  return Math.abs(r1 - r2) + Math.abs(c1 - c2);
}

// Glass and floor are interchangeable for goal satisfaction.
// Defined locally to avoid a circular import with gameState.ts.
const isSolid = (c: Cell) =>
  c === "floor" ||
  c === "glass" ||
  c === "wall" ||
  c === "button" ||
  c === "trap_inactive" ||
  c === "trap_active";

const cellMatchesTarget = (cur: Cell, tgt: Cell) =>
  isSolid(tgt) ? isSolid(cur) : cur === tgt;

// A held or excess tile can fill a deficit if both are solid, or if they are
// the same non-solid type (e.g. stairs → stairs).
const canFill = (source: Cell, deficitType: Cell) =>
  isSolid(source) && isSolid(deficitType) ? true : source === deficitType;

export interface HeuristicResult {
  /** Sum of all three components. */
  total: number;
  /** Number of board cells that don't yet match the target. */
  mismatches: number;
  /** Transportation lower bound: cost to carry misplaced tiles to their destinations. */
  transportCost: number;
  /** Player travel lower bound: cost to reach the first excess or deficit tile. */
  travelCost: number;
  /** 1 if we need a final jump and we're on a tile; 0 otherwise */
  finalJumpCost: number;
}

export function heuristic(
  state: GameState,
  target: Board,
  requireFinalJump: boolean,
): HeuristicResult {
  const { board, player, entities } = state;

  let mismatches = 0;
  const excess: [number, number, Cell][] = []; // cells with tiles that shouldn't be there
  const deficit: [number, number, Cell][] = []; // cells that need a tile delivered

  let finalJumpCost =
    requireFinalJump && board[player.row]![player.col]! !== "empty" ? 1 : 0;

  // We wrap these in IIFEs so the profiler names each part individually
  (function calculateBoardDiff() {
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 6; c++) {
        const cur = board[r]![c]!;
        const tgt = target[r]![c]!;
        // Glass the player is standing on will break for free on their next move.
        // If the target wants that cell empty, the mismatch resolves at no extra cost —
        // and crucially, the glass cannot be transported (it simply breaks), so it must
        // not be added to excess. If the target wants empty here, the player must have
        // moved away by then, and the break is free.
        if (
          r === player.row &&
          c === player.col &&
          cur === "glass" &&
          tgt === "empty"
        ) {
          continue;
        }
        // The occupied tile is glass but the target wants a solid tile. The glass is doomed
        // to break whenever the player leaves, so the cell will need a replacement. Only
        // apply for full solves (requireFinalJump): in intermediate tests the player may
        // legitimately still be standing on that glass in the target state.
        else if (
          requireFinalJump &&
          r === player.row &&
          c === player.col &&
          cur === "glass" &&
          cellMatchesTarget(cur, tgt)
        ) {
          mismatches++;
          deficit.push([r, c, cur]);
        } else if (!cellMatchesTarget(cur, tgt)) {
          mismatches++;
          if (cur !== "empty") excess.push([r, c, cur]);
          if (tgt !== "empty") deficit.push([r, c, tgt]);
        }
      }
    }
  })();

  if (mismatches === 0)
    return {
      total: finalJumpCost,
      mismatches: 0,
      transportCost: 0,
      travelCost: 0,
      finalJumpCost,
    };

  let transportCost = 0;
  (function calculateTransportCost() {
    // --- Transportation lower bound ---
    // Each deficit cell needs a compatible tile delivered to it.
    // Solid deficits (floor/glass) can be filled by any solid excess tile.
    // For each deficit, find the nearest compatible excess tile.
    // Min movement to carry a tile from S to D: max(0, manhattan(S, D) − 2).
    // Proof: player starts adjacent to S (dist 1) and ends adjacent to D (dist 1),
    // so movement ≥ manhattan(S, D) − 2. Matching each deficit to its nearest
    // compatible source is admissible: the optimal assignment can only pair it to
    // a same-or-farther source.
    for (const [dr, dc, dtype] of deficit) {
      const sources = excess.filter(([, , etype]) => canFill(etype, dtype));
      if (sources.length > 0) {
        transportCost += Math.min(
          ...sources.map(([er, ec]) =>
            Math.max(0, manhattan(er, ec, dr, dc) - 2),
          ),
        );
      }
    }
  })();

  let travelCost = 0;
  (function calculateTravelCost() {
    // --- Player travel to first work item ---
    // Min movement to be adjacent to cell C: max(0, manhattan(player, C) − 1).
    const holding = player.staffContent !== "empty";

    if (holding) {
      // Player is carrying a tile; find the nearest deficit it can fill.
      // If none exists, the tile will be placed temporarily — no travel cost charged.
      const matchingDeficits = deficit.filter(([, , dtype]) =>
        canFill(player.staffContent as Cell, dtype),
      );
      if (matchingDeficits.length > 0) {
        travelCost += Math.min(
          ...matchingDeficits.map(([dr, dc]) =>
            Math.max(0, manhattan(player.row, player.col, dr, dc) - 1),
          ),
        );
      }
    } else if (excess.length > 0) {
      // Player needs to reach an excess tile to start picking up.
      travelCost += Math.min(
        ...excess.map(([er, ec]) =>
          Math.max(0, manhattan(player.row, player.col, er, ec) - 1),
        ),
      );
    }
  })();
  
  // Trap tiles factor...?
  function hasTrap(board: Board): boolean {
    for (let i = 0; i < 6; i++) {
      for (let i2 = 0; i2 < 6; i2++) {
        if (board[i]![i2]! === "trap_inactive" || board[i]![i2]! === "trap_active") {
          return true;
        }
      }
    }
    return false;
  }
  function activeTraps(board: Board): number {
    let count = 0;
    for (let i = 0; i < 6; i++) {
      for (let i2 = 0; i2 < 6; i2++) {
        if (board[i]![i2]! === "trap_active") {
          count++;
        }
      }
    }
    return count;
  }
  const theWatchers = staffBanned(entities) ? Infinity : 0;

  return {
    total: mismatches + transportCost + travelCost + finalJumpCost + theWatchers,
    mismatches,
    transportCost: transportCost,
    travelCost: travelCost,
    finalJumpCost,
  };
}
