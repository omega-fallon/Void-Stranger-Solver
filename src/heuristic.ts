import type { Board, GameState } from "./types";

function manhattan(r1: number, c1: number, r2: number, c2: number): number {
  return Math.abs(r1 - r2) + Math.abs(c1 - c2);
}

export function heuristic(state: GameState, target: Board): number {
  const { board, player } = state;

  let mismatches = 0;
  // Cells that have a tile on the board but shouldn't (or have the wrong tile).
  const excess: [number, number][] = [];
  // Cells that need a tile in the target but are currently empty (or have wrong tile).
  const deficit: [number, number][] = [];

  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 6; c++) {
      const cur = board[r]![c]!;
      const tgt = target[r]![c]!;
      if (cur !== tgt) {
        mismatches++;
        if (cur !== "empty") excess.push([r, c]);
        if (tgt !== "empty") deficit.push([r, c]);
      }
    }
  }

  if (mismatches === 0) return 0;

  let extraCost = 0;

  // --- Transportation lower bound ---
  // Each excess tile must be carried to some deficit cell.
  // Carrying tile from S to D: player starts adjacent to S, ends adjacent to D.
  // Min movement ≥ max(0, manhattan(S, D) − 2).
  // Proof: for any adjacent A of S and adjacent B of D,
  //   manhattan(A,B) ≥ manhattan(S,D) − manhattan(A,S) − manhattan(B,D) = manhattan(S,D) − 2.
  // Matching each excess to its nearest deficit is admissible because the optimal
  // assignment can only pair it to a same-or-farther deficit.
  if (deficit.length > 0) {
    // Only deficit.length of the excess tiles actually need to be transported to
    // a deficit cell — the rest are simply destroyed (walked over as glass, etc.).
    // Compute each excess tile's distance to its nearest deficit, take the N
    // smallest (N = deficit.length), and sum those. This is a lower bound because
    // the optimal assignment can only match tiles to same-or-farther deficits.
    const transportDistances = excess
      .map(([er, ec]) =>
        Math.min(
          ...deficit.map(([dr, dc]) =>
            Math.max(0, manhattan(er, ec, dr, dc) - 2),
          ),
        ),
      )
      .sort((a, b) => a - b)
      .slice(0, deficit.length);

    const transportCostSum = transportDistances.reduce((a, b) => a + b, 0);
    extraCost += transportCostSum > 0 ? transportCostSum - 0 : 0;
  }

  // --- Player travel to first work item ---
  // The player must travel to be adjacent to their next piece of work before acting.
  // Min movement to be adjacent to cell C: max(0, manhattan(player, C) − 1).
  const holding = player.staffContent !== "empty";

  if (!holding && excess.length > 0) {
    // Player needs to reach an excess tile to pick it up.
    extraCost += Math.min(
      ...excess.map(([er, ec]) =>
        Math.max(0, manhattan(player.row, player.col, er, ec) - 1),
      ),
    );
  } else if (holding && deficit.length > 0) {
    // Player is already carrying something; needs to reach a deficit cell to place it.
    extraCost += Math.min(
      ...deficit.map(([dr, dc]) =>
        Math.max(0, manhattan(player.row, player.col, dr, dc) - 1),
      ),
    );
  }

  return mismatches + extraCost;
}
