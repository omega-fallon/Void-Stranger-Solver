import type { Board, Cell, GameState } from "./types";

function manhattan(r1: number, c1: number, r2: number, c2: number): number {
  return Math.abs(r1 - r2) + Math.abs(c1 - c2);
}

// Glass and floor are interchangeable for goal satisfaction.
// Defined locally to avoid a circular import with gameState.ts.
const isSolid = (c: Cell) => c === "floor" || c === "glass";
const cellMatchesTarget = (cur: Cell, tgt: Cell) =>
  isSolid(tgt) ? isSolid(cur) : cur === tgt;

// A held or excess tile can fill a deficit if both are solid, or if they are
// the same non-solid type (e.g. stairs → stairs).
const canFill = (source: Cell, deficitType: Cell) =>
  isSolid(source) && isSolid(deficitType) ? true : source === deficitType;

export function heuristic(state: GameState, target: Board): number {
  const { board, player } = state;

  let mismatches = 0;
  const excess: [number, number, Cell][] = []; // cells with tiles that shouldn't be there
  const deficit: [number, number, Cell][] = []; // cells that need a tile delivered

  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 6; c++) {
      const cur = board[r]![c]!;
      const tgt = target[r]![c]!;
      if (!cellMatchesTarget(cur, tgt)) {
        // Glass the player is standing on will break for free on their next move.
        // If the target wants that cell empty, the mismatch resolves at no extra cost.
        if (
          r === player.row &&
          c === player.col &&
          cur === "glass" &&
          tgt === "empty"
        ) {
          continue;
        }
        mismatches++;
        if (cur !== "empty") excess.push([r, c, cur]);
        if (tgt !== "empty") deficit.push([r, c, tgt]);
      }
    }
  }

  if (mismatches === 0) return 0;

  let extraCost = 0;

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
      extraCost += Math.min(
        ...sources.map(([er, ec]) =>
          Math.max(0, manhattan(er, ec, dr, dc) - 2),
        ),
      );
    }
  }

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
      extraCost += Math.min(
        ...matchingDeficits.map(([dr, dc]) =>
          Math.max(0, manhattan(player.row, player.col, dr, dc) - 1),
        ),
      );
    }
  } else if (excess.length > 0) {
    // Player needs to reach an excess tile to start picking up.
    extraCost += Math.min(
      ...excess.map(([er, ec]) =>
        Math.max(0, manhattan(player.row, player.col, er, ec) - 1),
      ),
    );
  }

  return mismatches + extraCost;
}
