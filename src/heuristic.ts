import type {
  Board,
  Cell,
  GameState,
  EntityGrid,
  Burdens,
  PlayerState,
  StaffContent,
} from "./types";
import { staffBanned } from "./search";
import { inBounds, facedTile, anyEntities } from "./gameState";

function manhattan(r1: number, c1: number, r2: number, c2: number): number {
  return Math.abs(r1 - r2) + Math.abs(c1 - c2);
}

export function naiveBoardDifference(state: Board, brand: Board): number {
  let counter = 0;

  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 6; c++) {
      // Excess tiles. Half-count glass..
      if (state[r]![c]! !== "empty" && brand[r]![c]! === "empty") {
        counter++;
        if (state[r]![c]! === "glass") {
          counter -= 0.5;
        }
      }

      // Deficit tiles.
      if (state[r]![c]! === "empty" && brand[r]![c]! !== "empty") {
        counter++;
      }
    }
  }

  return counter;
}

// Functions for tests.
export function coordsEqual(a: [number, number], b: [number, number]): boolean {
  return a[0] === b[0] && a[1] === b[1];
}
export function tileEqual(a: Cell, b: StaffContent): boolean {
  return String(a) === String(b);
}
export function offByStoodGlass(
  a: Board,
  b: Board,
  player: PlayerState,
): boolean {
  for (let i = 0; i < 6; i++) {
    for (let i2 = 0; i2 < 6; i2++) {
      if (
        a[i]![i2]! === b[i]![i2]! ||
        (a[i]![i2]! === "glass" &&
          b[i]![i2]! === "empty" &&
          player.row === i &&
          player.col === i2)
      ) {
        // pass
      } else {
        return false;
      }
    }
  }
  return true;
}
export function offByPlacingTile(
  a: Board,
  b: Board,
  player: PlayerState,
): boolean {
  for (let i = 0; i < 6; i++) {
    for (let i2 = 0; i2 < 6; i2++) {
      if (
        a[i]![i2]! === b[i]![i2]! ||
        // Tile in source is empty,
        (a[i]![i2]! === "empty" &&
          // Is the faced tile of the player,
          coordsEqual([i, i2], facedTile(player)) &&
          // And is the [-1] contents of the player's staff in initial.
          player.staffContent.length > 0 &&
          tileEqual(b[i]![i2]!, player.staffContent.at(-1)!))
      ) {
        // pass
      } else {
        return false;
      }
    }
  }
  return true;
}
export function offByTakingTile(
  a: Board,
  b: Board,
  player: PlayerState,
): boolean {
  for (let i = 0; i < 6; i++) {
    for (let i2 = 0; i2 < 6; i2++) {
      if (
        a[i]![i2]! === b[i]![i2]! ||
        // Tile in initial is not empty.
        (a[i]![i2]! !== "empty" &&
          // Tile in target is empty,
          b[i]![i2]! === "empty" &&
          // Is the faced tile of the player,
          coordsEqual([i, i2], facedTile(player)) &&
          // And the staff can take.
          player.staffContent.length === 0)
      ) {
        // pass
      } else {
        return false;
      }
    }
  }
  return true;
}

// Returns true if a tile is valid for being the "white" of a carved brand.
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

// Add brane heuristic.
export function addHeuristic(
  state: GameState,
  target: Board,
  requireFinalJump: boolean,
  burdens: Burdens,
): HeuristicResult {
  const { board, player, entities } = state;

  let mismatches = 0;
  const excess: [number, number, Cell][] = []; // cells with tiles that shouldn't be there
  const deficit: [number, number, Cell][] = []; // cells that need a tile delivered

  const finalJumpCost =
    requireFinalJump && board[player.row]![player.col]! !== "empty" ?
      burdens.wings ?
        2
      : 1
    : 0;

  // We wrap these in IIFEs so the profiler names each part individually
  (function calculateBoardDiff() {
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 6; c++) {
        const cur = board[r]![c]!;
        const tgt = target[r]![c]!;

        if (!cellMatchesTarget(cur, tgt)) {
          mismatches++;
          
          if (cur !== "empty") excess.push([r, c, cur]);
          else if (tgt !== "empty") deficit.push([r, c, tgt]);
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

    // Run for each deficit.
    for (const [dr, dc, dtype] of deficit) {
      // Account for us already holding a tile.
      let heldCandidate = Infinity;
      if (
        player.staffContent.length > 0 &&
        canFill(player.staffContent.at(-1)!, dtype)
      ) {
        heldCandidate = manhattan(player.row, player.col, dr, dc) - 1;
      }

      // Filter a list of excess tiles which can be used to fill that deficit.
      const sources = excess.filter(([, , etype]) => canFill(etype, dtype));

      // If any are applicable...
      let filterListCandidate = Infinity;
      if (sources.length > 0) {
        // Add to our total the moving distance between the applicable excess and our currently-viewed deficit.
        filterListCandidate = Math.min(
          ...sources.map(([er, ec]) =>
            Math.max(0, manhattan(er, ec, dr, dc) - 2),
          ),
        );
      }

      // Quit early.
      if (heldCandidate === Infinity && filterListCandidate === Infinity) {
        continue;
      }

      // Between the held tile and our filtered list, which distance is shortest for this deficit?
      transportCost += Math.min(heldCandidate, filterListCandidate);
    }
  })();

  let travelCost = Infinity;
  (function calculateTravelCost() {
    // --- Player travel to first work item ---
    // Min movement to be adjacent to cell C: max(0, manhattan(player, C) − 1).
    const holding = player.staffContent.length > 0;

    // Two variables: add the lowest?
    let travelCostDeficits = Infinity;
    let travelCostExcess = Infinity;

    // Filling deficits.
    if (holding) {
      // Player is carrying a tile; find the nearest deficit it can fill.
      // If none exists, the tile will be placed temporarily — no travel cost charged.
      const matchingDeficits = deficit.filter(([, , dtype]) =>
        canFill(player.staffContent.at(-1) as Cell, dtype),
      );
      if (matchingDeficits.length > 0) {
        travelCostDeficits = Math.min(
          ...matchingDeficits.map(([dr, dc]) =>
            Math.max(0, manhattan(player.row, player.col, dr, dc) - 1),
          ),
        );
      }
    }

    // Removing excess. Must be able to take with the Void Rod.
    if (
      excess.length > 0 &&
      (!holding || burdens.endless)
    ) {
      // Player needs to reach adjacent to an excess tile to remove it.
      travelCostExcess = Math.min(
        ...excess.map(([er, ec]) => (
          // If we're ON the tile, we would have to move to be able to be able to pick it up, taking a minimum of 3 moves to do so.
          (player.row === er && player.col === ec) ? 3 :

          // If we're DIRECTLY NEXT TO the tile but not facing it, it will take a minimum of 2 moves to do so.
          (manhattan(player.row, player.col, er, ec) === 1 && !(facedTile(player)[0] === er && facedTile(player)[1] === ec) ? 2 : 

          // If it's DIRECTLY DIAGONAL to us, it will take 3 moves to reposition correctly.
          (manhattan(player.row, player.col, er, ec) === 2 ? 3 :

          // Our default case.
          manhattan(player.row, player.col, er, ec) - 1))
        ),
      ));
    }

    // Return the least.
    travelCost = Math.max(0, Math.min(travelCostDeficits, travelCostExcess));

    // I forget what situations triggers this. Probably just a failsafe.
    if (travelCost === Infinity) {
      travelCost = 0;
    } else {
      travelCost = Math.max(0, travelCost);
    }
  })();

  return {
    total: (mismatches + transportCost + travelCost + finalJumpCost),
    mismatches: mismatches,
    transportCost: transportCost,
    travelCost: travelCost,
    finalJumpCost: finalJumpCost,
  };
}

export function heuristic(
  braneName: string,
  state: GameState,
  target: Board,
  requireFinalJump: boolean,
  burdens: Burdens,
): HeuristicResult {
  if (braneName === "Add") {
    return addHeuristic(state,target,requireFinalJump,burdens);
  }

  const { board, player, entities } = state;

  // Using this to detect some... stuff?
  // 0 - no entities, just floor & stair tiles
  let simplifyState = -1

  const peaceful = anyEntities(entities);

  let mismatches = 0;
  const excess: [number, number, Cell][] = []; // cells with tiles that shouldn't be there
  const deficit: [number, number, Cell][] = []; // cells that need a tile delivered

  const finalJumpCost =
    requireFinalJump && board[player.row]![player.col]! !== "empty" ?
      burdens.wings ?
        2
      : 1
    : 0;

  // Function declarations.
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
        // Quick-and-dirty admissibility assurance, disable when we figure out something smarter.
        else if (
          cur === "glass" &&
          mimics &&
          manhattan(r, c, mimic_r, mimic_c) <
            manhattan(r, c, player.row, player.col)
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

    // Run for each deficit.
    for (const [dr, dc, dtype] of deficit) {
      // Account for us already holding a tile.
      let heldCandidate = Infinity;
      if (
        player.staffContent.length > 0 &&
        canFill(player.staffContent.at(-1)!, dtype)
      ) {
        heldCandidate = manhattan(player.row, player.col, dr, dc) - 1;
      }

      // Filter a list of excess tiles which can be used to fill that deficit.
      const sources = excess.filter(([, , etype]) => canFill(etype, dtype));

      // If any are applicable...
      let filterListCandidate = Infinity;
      if (sources.length > 0) {
        // Add to our total the moving distance between the applicable excess and our currently-viewed deficit.
        filterListCandidate = Math.min(
          ...sources.map(([er, ec]) =>
            Math.max(0, manhattan(er, ec, dr, dc) - 2),
          ),
        );
      }

      // Quit early.
      if (heldCandidate === Infinity && filterListCandidate === Infinity) {
        continue;
      }

      // Between the held tile and our filtered list, which distance is shortest for this deficit?
      transportCost += Math.min(heldCandidate, filterListCandidate);
    }
  })();

  let travelCost = Infinity;
  (function calculateTravelCost() {
    function excessContainsGlass(ex: [number, number, Cell][]): boolean {
      for (const ar of ex) {
        if (ar[2] === "glass") {
          return true;
        }
      }
      return false;
    }
    function countExcessGlass(ex: [number, number, Cell][]): number {
      let counter = 0;
      for (const ar of ex) {
        if (ar[2] === "glass") {
          counter++;
        }
      }
      return counter;
    }

    function blockerCost(
      board: Board,
      entities: EntityGrid,
      er: number,
      ec: number,
      breaker_r: number,
      breaker_c: number,
      player: boolean,
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
        // Subtract one if as a distance modifier if we can take the tile directly..
        if (player) {
          return !holding || burdens.endless ? -1 : 0;
        } else {
          return 0;
        }
      }
    }

    // --- Player travel to first work item ---
    // Min movement to be adjacent to cell C: max(0, manhattan(player, C) − 1).
    const holding = player.staffContent.length > 0;

    // Two variables: add the lowest?
    let travelCostDeficits = Infinity;
    let travelCostExcess = Infinity;

    // Filling deficits.
    if (holding) {
      // Player is carrying a tile; find the nearest deficit it can fill.
      // If none exists, the tile will be placed temporarily — no travel cost charged.
      const matchingDeficits = deficit.filter(([, , dtype]) =>
        canFill(player.staffContent.at(-1) as Cell, dtype),
      );
      if (matchingDeficits.length > 0) {
        travelCostDeficits = Math.min(
          ...matchingDeficits.map(([dr, dc]) =>
            Math.max(0, manhattan(player.row, player.col, dr, dc) - 1),
          ),
        );
      }
    }
    // Removing excess. This is only possible if we can take with the Void Rod or if we have glass in the excess.
    if (
      excess.length > 0 &&
      (!holding || burdens.endless || excessContainsGlass(excess))
    ) {
      // Player needs to reach adjacent to an excess tile and be holding nothing to start picking up, OR if the tile is glass, can also step directly on it.
      travelCostExcess = Math.min(
        ...excess.map(([er, ec]) =>
          board[er]![ec]! === "glass" ?
            // Glass logic. The player, or an entity, can step directly on the tile to remove it. If the player is not holding anything, they can also just pick it up from adjacent, reducing the player's distance by one.
            Math.max(
              0,
              Math.min(
                manhattan(player.row, player.col, er, ec) +
                  blockerCost(
                    board,
                    entities,
                    er,
                    ec,
                    player.row,
                    player.col,
                    true,
                  ),

                mimics ?
                  manhattan(mimic_r, mimic_c, er, ec) +
                    blockerCost(
                      board,
                      entities,
                      er,
                      ec,
                      mimic_r,
                      mimic_c,
                      false,
                    )
                : Infinity,

                beavers ?
                  manhattan(beaver_r, beaver_c, er, ec) +
                    blockerCost(
                      board,
                      entities,
                      er,
                      ec,
                      beaver_r,
                      beaver_c,
                      false,
                    )
                : Infinity,
              ),
            )
            // Non-glass logic - we can return infinity here because an earlier check ensures this mapping has at least one finite value.
          : !burdens.endless && holding ? Infinity
          : manhattan(player.row, player.col, er, ec) +
            blockerCost(board, entities, er, ec, player.row, player.col, true),
        ),
      );
    }

    // Return the least.
    travelCost = Math.max(0, Math.min(travelCostDeficits, travelCostExcess));

    // I forget what situations triggers this. Probably just a failsafe.
    if (travelCost === Infinity) {
      travelCost = 0;
    } else {
      // Account for player walking over excess glass on the way there. Currently this assumes we hit every single piece of excess glass and no useful and necessary ones. This is a massive subtraction. Fix this.
      travelCost -= countExcessGlass(excess);
      // This is a slightly quick-and-dirty fix to handle edge cases of non-admissibility.
      //travelCost -= mismatches;
      // Cap the value.
      travelCost = Math.max(0, travelCost);
    }
  })();

  return {
    total: Math.floor(
      (mismatches + transportCost + travelCost + finalJumpCost) *
        (burdens.endless ? 1 : 1),
    ),
    mismatches: mismatches,
    transportCost: transportCost,
    travelCost: travelCost,
    finalJumpCost: finalJumpCost,
  };
}
