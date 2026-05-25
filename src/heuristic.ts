import type { Board, Cell, GameState } from "./types";

function manhattan(r1: number, c1: number, r2: number, c2: number): number {
  return Math.abs(r1 - r2) + Math.abs(c1 - c2);
}

export function heuristic(state: GameState, target: Board): number {
  const { board, player } = state;

  let mismatches = 0;
  const excess: [number, number, Cell][] = []; // cells with wrong/extra tiles
  const deficit: [number, number, Cell][] = []; // cells that need a specific tile

  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 6; c++) {
      const cur = board[r]![c]!;
      const tgt = target[r]![c]!;
      if (cur !== tgt) {
        mismatches++;
        if (cur !== "empty") excess.push([r, c, cur]);
        if (tgt !== "empty") deficit.push([r, c, tgt]);
      }
    }
  }

  if (mismatches === 0) return 0;

  let extraCost = 0;

  // --- Transportation lower bound (type-aware) ---
  // Each deficit cell needs a tile of its specific type delivered to it.
  // For each deficit, find the nearest excess tile of the same type.
  // Min movement to carry a tile from S to D: max(0, manhattan(S, D) − 2).
  // Proof: player starts adjacent to S (dist 1) and ends adjacent to D (dist 1),
  // so movement ≥ manhattan(S, D) − 2. Matching each deficit to its nearest
  // same-type source is admissible: the optimal assignment can only pair it to
  // a same-or-farther source.
  for (const [dr, dc, dtype] of deficit) {
    const sources = excess.filter(([, , etype]) => etype === dtype);
    if (sources.length > 0) {
      extraCost += Math.min(
        ...sources.map(([er, ec]) => Math.max(0, manhattan(er, ec, dr, dc) - 2)),
      );
    }
  }

  // --- Player travel to first work item (type-aware) ---
  // Min movement to be adjacent to cell C: max(0, manhattan(player, C) − 1).
  const holding = player.staffContent !== "empty";

  if (holding) {
    // Player is carrying a tile; they need to reach a deficit that accepts it.
    // If no same-type deficit exists, the held tile will be placed temporarily
    // or destroyed — we can't charge any travel cost without overestimating.
    const matchingDeficits = deficit.filter(([, , dtype]) => dtype === player.staffContent);
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
