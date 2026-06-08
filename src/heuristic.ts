import type { Board, Cell, GameState, EntityGrid } from "./types";
import { staffBanned } from "./search";
import { inBounds } from "./gameState";

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

  const finalJumpCost =
    requireFinalJump && board[player.row]![player.col]! !== "empty" ? 1 : 0;

  function findMimic(entities: EntityGrid): [number, number] {
    for (let i = 0; i < 6; i++) {
      for (let i2 = 0; i2 < 6; i2++) {
        if (entities[i]![i2]! === "mimic") {
          return [i, i2];
        }
      }
    }
    return [-1, -1];
  }
  function findBeaver(entities: EntityGrid): [number, number] {
    for (let i = 0; i < 6; i++) {
      for (let i2 = 0; i2 < 6; i2++) {
        if (entities[i]![i2]! === "beaver") {
          return [i, i2];
        }
      }
    }
    return [-1, -1];
  }

  const [mimic_r, mimic_c] = findMimic(entities);
  const mimics: boolean = mimic_r !== -1;

  const [beaver_r, beaver_c] = findBeaver(entities);
  const beavers: boolean = beaver_r !== -1;

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
          ((r === player.row && c === player.col) ||
            (mimics && r === mimic_r && c === mimic_c) ||
            (beavers && r === beaver_r && c === beaver_c)) &&
          cur === "glass" &&
          tgt === "empty"
        ) {
          continue;
        }
        // Ignore activated traps, since they might get dropped for free, or they might
        // get used as floors for brand matching purposes
        // Ignoring them ensures admissibility.
        else if (cur === "trap_active") {
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
      finalJumpCost: finalJumpCost,
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

    // Two variables: add the lowest?
    let travelCostDeficits = 0;
    let travelCostExcess = 0;

    if (holding) {
      // Player is carrying a tile; find the nearest deficit it can fill.
      // If none exists, the tile will be placed temporarily — no travel cost charged.
      const matchingDeficits = deficit.filter(([, , dtype]) =>
        canFill(player.staffContent as Cell, dtype),
      );
      if (matchingDeficits.length > 0) {
        travelCostDeficits += Math.min(
          ...matchingDeficits.map(([dr, dc]) =>
            Math.max(0, manhattan(player.row, player.col, dr, dc) - 1),
          ),
        );
      }
    }

    function excessContainsGlass(ex: [number, number, Cell][]): boolean {
      for (const ar of ex) {
        if (ar[2] === "glass") {
          return true;
        }
      }
      return false;
    }

    function blockerCost(
      board: Board,
      entities: EntityGrid,
      er: number,
      ec: number,
      breaker_r: number,
      breaker_c: number,
    ): number {
      //return 0;
      const blockers = ["rock", "watcher_inactive", "watcher_active", "chest"];
      if (
        entities[er]![ec]! !== "chest" &&
        blockers.includes(entities[er]![ec]!)
      ) {
        // Establish distance from pushing spots.
        let cardinalDists: [
          [string, number],
          [string, number],
          [string, number],
          [string, number],
        ] = [
          ["n", manhattan(er - 1, ec, breaker_r, breaker_c)],
          ["e", manhattan(er, ec + 1, breaker_r, breaker_c)],
          ["w", manhattan(er, ec - 1, breaker_r, breaker_c)],
          ["s", manhattan(er + 1, ec, breaker_r, breaker_c)],
        ];

        // Sort shortest to longest distance.
        function compDist(a: [string, number], b: [string, number]): number {
          return a[1] - b[1];
        }
        cardinalDists.sort(compDist);

        // Check for valid pushing spots.
        for (const cardinal of cardinalDists) {
          const spot_r =
            er +
            (cardinal[0] === "n" ? -1
            : cardinal[0] === "s" ? 1
            : 0);
          const spot_c =
            ec +
            (cardinal[0] === "w" ? -1
            : cardinal[0] === "e" ? 1
            : 0);
          const oppositeSpot_r =
            er +
            (cardinal[0] === "n" ? 1
            : cardinal[0] === "s" ? -1
            : 0);
          const oppositeSpot_c =
            ec +
            (cardinal[0] === "w" ? 1
            : cardinal[0] === "e" ? -1
            : 0);

          // Invalid spot, move to next-closest
          if (
            !inBounds(spot_r, spot_c) ||
            !inBounds(oppositeSpot_r, oppositeSpot_c) ||
            board[spot_r]![spot_c]! === "empty" ||
            blockers.includes(entities[spot_r]![spot_c]!) ||
            blockers.includes(entities[oppositeSpot_r]![oppositeSpot_c]!)
          ) {
            continue;
          }
          // Valid spot. The returned factor is 1 (for the push) + the difference between the shortest viable pushing spot and the ideal pushing spot. We subtract one if the covered tile is glass since then, the entity wouldn't have to move onto the glass itself. (Or take it with the wand, if player & not holding)
          else {
            return (
              1 +
              (cardinal[1] - cardinalDists[0][1]) -
              (board[er]![ec]! === "glass" ? 1 : 0)
            );
          }
        }

        // No valid spots.
        return Infinity;
      } else {
        return 0;
      }
    }

    if (excess.length > 0 && excessContainsGlass(excess)) {
      // Player needs to reach adjacent to an excess tile and be holding nothing to start picking up, OR if the tile is glass, can also step directly on it.
      travelCostExcess += Math.min(
        ...excess.map(([er, ec]) =>
          board[er]![ec]! === "glass" ?
            // Glass logic. The player, or an entity, can step directly on the tile to remove it. If the player is not holding anything, they can also just pick it up from adjacent, reducing the player's distance by one.
            Math.max(
              0,
              Math.min(
                manhattan(player.row, player.col, er, ec) -
                  (holding ? 0 : 1) +
                  blockerCost(board, entities, er, ec, player.row, player.col),

                mimics ?
                  manhattan(mimic_r, mimic_c, er, ec) +
                    blockerCost(board, entities, er, ec, mimic_r, mimic_c)
                : Infinity,

                beavers ?
                  manhattan(beaver_r, beaver_c, er, ec) +
                    blockerCost(board, entities, er, ec, beaver_r, beaver_c)
                : Infinity,
              ),
            )
            // Non-glass logic - we can return infinity here because an earlier check ensures this mapping has at least one finite value.
          : holding ? Infinity
          : Math.max(0, manhattan(player.row, player.col, er, ec) - 1) +
            blockerCost(board, entities, er, ec, player.row, player.col),
        ),
      );
    }

    // Return the least.
    travelCost += Math.min(travelCostDeficits, travelCostExcess);
  })();

  return {
    total: mismatches + transportCost + travelCost + finalJumpCost,
    mismatches: mismatches,
    transportCost: transportCost,
    travelCost: travelCost,
    finalJumpCost: finalJumpCost,
  };
}
