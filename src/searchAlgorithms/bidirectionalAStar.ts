import { ACTIONS, applyAction, isGoal, stateKey } from "../gameState";
import { heuristic } from "../heuristic";
import { MinHeap } from "../priorityQueue";
import { NO_BURDENS } from "../types";
import type {
  Action,
  Board,
  Burdens,
  Cell,
  Direction,
  Entity,
  EntityGrid,
  GameState,
  SearchNode,
  StaffContent,
} from "../types";
import {
  countFloorTiles,
  isPruned,
  type SearchOptions,
  type SearchResult,
} from "./shared";
import { reconstructPath } from "./aStar";

const DIRECTION_DELTA: Record<Direction, [number, number]> = {
  up: [-1, 0],
  down: [1, 0],
  left: [0, -1],
  right: [0, 1],
};

const ALL_FACINGS: Direction[] = ["up", "down", "left", "right"];

const ALL_STAFF_CONTENTS: StaffContent[][] = [
  [] as StaffContent[],
  ["floor"] as StaffContent[],
  ["glass"] as StaffContent[],
  ["stairs"] as StaffContent[],
  ["button"] as StaffContent[],
  ["trap_inactive"] as StaffContent[],
  ["trap_active"] as StaffContent[],
];

// Entities whose positions can change during gameplay.
// TODO: beaver has custom movement logic not yet implemented — treat as fixed for now.
const MOBILE_ENTITY_TYPES = new Set<Entity>([
  "rock",
  "watcher_inactive",
  "watcher_active",
  "monster_statue",
]);

function setBoardCell(board: Board, r: number, c: number, val: Cell): Board {
  return board.map((row, ri) =>
    ri === r ? row.map((cell, ci) => (ci === c ? val : cell)) : row,
  ) as Board;
}

function setEntityCell(
  entities: EntityGrid,
  r: number,
  c: number,
  val: Entity,
): EntityGrid {
  return entities.map((row, ri) =>
    ri === r ? row.map((e, ci) => (ci === c ? val : e)) : row,
  ) as EntityGrid;
}

/**
 * Recursively places mobile entities at permutations of valid target-board
 * cells, accumulating every distinct EntityGrid into `results`.
 *
 * `mobile` is an array of { variants, canDisappear } — one entry per mobile
 * entity that existed in the initial state.  `variants` lists the entity-type
 * values it could be in the goal (e.g. watcher can be inactive or active).
 * `canDisappear` is true for monster_statue (disperseMonsterStatues can remove it).
 */
function enumerateEntityGrids(
  mobile: Array<{ variants: Entity[]; canDisappear: boolean }>,
  validCells: Array<[number, number]>,
  idx: number,
  occupied: Set<string>,
  current: EntityGrid,
  results: EntityGrid[],
): void {
  if (idx === mobile.length) {
    results.push(current);
    return;
  }
  const { variants, canDisappear } = mobile[idx]!;

  // Place this entity at each unoccupied valid cell.
  for (const [r, c] of validCells) {
    const key = `${r},${c}`;
    if (occupied.has(key)) continue;
    occupied.add(key);
    for (const variant of variants) {
      enumerateEntityGrids(
        mobile,
        validCells,
        idx + 1,
        occupied,
        setEntityCell(current, r, c, variant),
        results,
      );
    }
    occupied.delete(key);
  }

  // For monster_statue: also allow it to have disappeared from the board.
  if (canDisappear) {
    enumerateEntityGrids(
      mobile,
      validCells,
      idx + 1,
      occupied,
      current,
      results,
    );
  }
}

/**
 * Produces every valid GameState that could be a solution end state:
 * board = target, entities in all possible configurations for mobile entity
 * types, player in any valid position/facing/staffContent on the target board.
 *
 * When requireFinalJump is true the player must be on an empty (void) cell
 * holding stairs — the "jump into the void" ending condition.
 */
function generateGoalStates(
  target: Board,
  initial: GameState,
  requireFinalJump: boolean,
  hasWings: boolean,
  endless: boolean,
): GameState[] {
  // Valid cells for entity placement: always non-empty, non-wall.
  const validEntityCells: Array<[number, number]> = [];
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 6; c++) {
      const cell = target[r]![c]!;
      if (cell !== "empty" && cell !== "wall") validEntityCells.push([r, c]);
    }
  }

  // Valid cells and staff contents for the player depend on the win condition.
  let validPlayerCells: Array<[number, number]>;
  let validStaffContents: StaffContent[][];
  // Endless Void Rod; not yet implemented.
  if (endless) {
    throw new Error("Not yet implemented.");
  }
  // Player must be in the void (empty cell) holding stairs.
  else if (requireFinalJump) {
    validPlayerCells = [];
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 6; c++) {
        if (target[r]![c]! === "empty") validPlayerCells.push([r, c]);
      }
    }
    validStaffContents = [["stairs"]] as StaffContent[][];
  }
  // Don't require final jump and subtract tiles that can't originate from the initial state.
  else {
    // Any non-wall is valid to stand on.
    if (hasWings) {
      validPlayerCells = [];
      for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 6; c++) {
          if (target[r]![c]! !== "wall") validPlayerCells.push([r, c]);
        }
      }
    }
    // Any solid tile is valid to stand on.
    else {
      validPlayerCells = [...validEntityCells];
    }

    // Any tile that could possibly originate from the initial state is a valid tile to be holding.
    let tilesInOrigin: StaffContent[] = [];
    let vscHolder: StaffContent[][] = [];

    for (const row of initial.board) {
      for (const col_i in row) {
        if (
          row[col_i] !== "empty" &&
          row[col_i] !== "wall" &&
          !tilesInOrigin.includes(row[col_i]!)
        ) {
          tilesInOrigin.push(row[col_i]!);
          vscHolder.push([row[col_i]!]);
        }
      }
    }

    validStaffContents = vscHolder;
  }

  // Use validEntityCells (not validPlayerCells) for entity placement so
  // entities are always on solid ground.
  const validCells = validEntityCells;

  // Split initial entities into mobile (enumerate) and fixed (keep in place).
  let baseEntities: EntityGrid = initial.entities.map((row) => [
    ...row,
  ]) as EntityGrid;
  const mobileSpecs: Array<{ variants: Entity[]; canDisappear: boolean }> = [];

  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 6; c++) {
      const e = initial.entities[r]![c]!;
      if (!MOBILE_ENTITY_TYPES.has(e)) continue;

      baseEntities = setEntityCell(baseEntities, r, c, "empty");

      if (e === "watcher_inactive" || e === "watcher_active") {
        mobileSpecs.push({
          variants: ["watcher_inactive", "watcher_active"],
          canDisappear: false,
        });
      } else if (e === "monster_statue") {
        mobileSpecs.push({ variants: ["monster_statue"], canDisappear: true });
      } else {
        // rock
        mobileSpecs.push({ variants: [e], canDisappear: false });
      }
    }
  }

  const entityGrids: EntityGrid[] = [];
  enumerateEntityGrids(
    mobileSpecs,
    validCells,
    0,
    new Set(),
    baseEntities,
    entityGrids,
  );

  // Cross entity grids with all valid player configs.
  const states: GameState[] = [];
  for (const entities of entityGrids) {
    // Pre-build the set of cells occupied by any entity in this grid.
    // (Only relevant when player must be on a solid cell; void cells can't
    // hold entities anyway, so for requireFinalJump=true this set is unused.)
    const entityOccupied = new Set<string>();
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 6; c++) {
        if (entities[r]![c]! !== "empty") entityOccupied.add(`${r},${c}`);
      }
    }

    for (const [r, c] of validPlayerCells) {
      if (entityOccupied.has(`${r},${c}`)) continue;
      for (const facing of ALL_FACINGS) {
        for (const staffContent of validStaffContents) {
          states.push({
            board: target,
            entities,
            player: { row: r, col: c, facing, staffContent },
          });
        }
      }
    }
  }

  return states;
}

/**
 * Maximum size of the connected empty region to enumerate for trap chains.
 * Regions larger than this are skipped to keep the candidate count tractable.
 * (2^MAX_TRAP_CHAIN subsets in the worst case, so keep this ≤ ~12.)
 */
const MAX_TRAP_CHAIN = 8;

/**
 * Given a board where (destR, destC) is currently empty, returns every board
 * that could be the predecessor before a trap-chain destruction fired at that
 * cell.  Each returned board replaces some non-empty connected subset of the
 * currently-empty region reachable from (destR, destC) with `trap_active`.
 *
 * The subsets are enumerated by a backtracking DFS that grows the chain one
 * cell at a time, so every connected subset (including single-cell chains) is
 * visited exactly once.
 */
function generateTrapChainBoards(
  board: Board,
  destR: number,
  destC: number,
): Board[] {
  if (board[destR]?.[destC] !== "empty") return [];

  // Flood-fill the connected empty region starting from (destR, destC).
  const region: Array<[number, number]> = [];
  const regionSet = new Set<string>();
  const bfsQueue: Array<[number, number]> = [[destR, destC]];
  regionSet.add(`${destR},${destC}`);
  while (bfsQueue.length > 0) {
    const [r, c] = bfsQueue.shift()!;
    region.push([r, c]);
    if (region.length > MAX_TRAP_CHAIN) return []; // Too large — skip
    for (const [dr, dc] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ] as const) {
      const nr = r + dr;
      const nc = c + dc;
      const nk = `${nr},${nc}`;
      if (
        nr >= 0 &&
        nr < 6 &&
        nc >= 0 &&
        nc < 6 &&
        !regionSet.has(nk) &&
        board[nr]?.[nc] === "empty"
      ) {
        regionSet.add(nk);
        bfsQueue.push([nr, nc]);
      }
    }
  }

  const results: Board[] = [];

  // Backtracking DFS over connected subsets of `region` that contain
  // (destR, destC).  `chainCells` / `chainSet` track the current subset;
  // `frontier` tracks which region cells can still be added while keeping
  // the subset connected.
  function buildChain(
    chainCells: Array<[number, number]>,
    chainSet: Set<string>,
    frontier: Array<[number, number]>,
  ): void {
    // Snapshot the current chain as a board with trap_active at those cells.
    let chainBoard = board;
    for (const [r, c] of chainCells) {
      chainBoard = setBoardCell(chainBoard, r, c, "trap_active");
    }
    results.push(chainBoard);

    // Try extending the chain with each frontier cell in turn.
    for (let i = 0; i < frontier.length; i++) {
      const [fr, fc] = frontier[i]!;
      const fk = `${fr},${fc}`;
      chainSet.add(fk);
      chainCells.push([fr, fc]);

      // New frontier: neighbours of (fr, fc) that are in the region but not
      // yet in the chain, de-duplicated against the remaining frontier.
      const newFrontier = frontier.slice(i + 1);
      for (const [dr, dc] of [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ] as const) {
        const nr = fr + dr;
        const nc = fc + dc;
        const nk = `${nr},${nc}`;
        if (
          regionSet.has(nk) &&
          !chainSet.has(nk) &&
          !newFrontier.some(([r2, c2]) => r2 === nr && c2 === nc)
        ) {
          newFrontier.push([nr, nc]);
        }
      }

      buildChain(chainCells, chainSet, newFrontier);

      // Backtrack.
      chainCells.pop();
      chainSet.delete(fk);
    }
  }

  const startKey = `${destR},${destC}`;
  const initialFrontier: Array<[number, number]> = [];
  for (const [dr, dc] of [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ] as const) {
    const nr = destR + dr;
    const nc = destC + dc;
    if (
      nr >= 0 &&
      nr < 6 &&
      nc >= 0 &&
      nc < 6 &&
      regionSet.has(`${nr},${nc}`)
    ) {
      initialFrontier.push([nr, nc]);
    }
  }

  buildChain([[destR, destC]], new Set([startKey]), initialFrontier);
  return results;
}

/**
 * For a movement action that left the player at (destR, destC) from source
 * (srcR, srcC), generate all plausible predecessor board+entity configurations.
 * Each candidate is then verified by the caller via applyAction.
 */
function movementCandidates(
  state: GameState,
  srcR: number,
  srcC: number,
  dr: number,
  dc: number,
): Array<{ board: Board; entities: EntityGrid }> {
  const { board, entities } = state;
  const destR = srcR + dr;
  const destC = srcC + dc;
  const nextR = destR + dr;
  const nextC = destC + dc;

  const base: Array<{ board: Board; entities: EntityGrid }> = [];

  // Case A: no board change.
  base.push({ board, entities });

  // Case B: glass was at source (player stepped off it, destroying it).
  if (board[srcR]?.[srcC] === "empty") {
    base.push({ board: setBoardCell(board, srcR, srcC, "glass"), entities });
  }

  // Cases C & D: entity was pushed from dest to dest+D.
  if (nextR >= 0 && nextR < 6 && nextC >= 0 && nextC < 6) {
    const entityAtNext = entities[nextR]?.[nextC];
    if (entityAtNext && entityAtNext !== "empty") {
      // Entity in predecessor was at dest, got pushed to dest+D.
      const newEntities = setEntityCell(
        setEntityCell(entities, nextR, nextC, "empty"),
        destR,
        destC,
        entityAtNext,
      );
      // Case C: no glass involved.
      base.push({ board, entities: newEntities });
      // Case D: entity was on glass at dest (glass broke as entity left).
      if (board[destR]?.[destC] === "empty") {
        base.push({
          board: setBoardCell(board, destR, destC, "glass"),
          entities: newEntities,
        });
      }
    }
  }

  // Case F: destination is currently empty — it may have been a destroyed trap
  // chain.  Enumerate every connected subset of the empty region at dest as a
  // possible set of trap_active tiles in the predecessor.  Also combine with
  // glass-at-source (B×F) and entity-pushed (C×F) where applicable.
  if (board[destR]?.[destC] === "empty") {
    const trapBoards = generateTrapChainBoards(board, destR, destC);
    for (const trapBoard of trapBoards) {
      // Plain F: no other changes.
      base.push({ board: trapBoard, entities });

      // B×F: player also stepped off glass at source.
      if (board[srcR]?.[srcC] === "empty") {
        base.push({
          board: setBoardCell(trapBoard, srcR, srcC, "glass"),
          entities,
        });
      }

      // C×F: entity was also pushed from dest to dest+D.
      if (nextR >= 0 && nextR < 6 && nextC >= 0 && nextC < 6) {
        const entityAtNext = entities[nextR]?.[nextC];
        if (entityAtNext && entityAtNext !== "empty") {
          const newEntities = setEntityCell(
            setEntityCell(entities, nextR, nextC, "empty"),
            destR,
            destC,
            entityAtNext,
          );
          base.push({ board: trapBoard, entities: newEntities });
        }
      }
    }
  }

  // Case E: combine each base variant with trap deactivations.
  // Active traps adjacent to either the source or dest cell may have been
  // activated by this move; try predecessors where each such trap was inactive.
  const trapPositions: Array<[number, number]> = [
    [srcR - 1, srcC],
    [srcR + 1, srcC],
    [srcR, srcC - 1],
    [srcR, srcC + 1],
    [destR - 1, destC],
    [destR + 1, destC],
    [destR, destC - 1],
    [destR, destC + 1],
  ];

  const withTraps: Array<{ board: Board; entities: EntityGrid }> = [...base];
  for (const { board: b, entities: e } of base) {
    for (const [tr, tc] of trapPositions) {
      if (
        tr >= 0 &&
        tr < 6 &&
        tc >= 0 &&
        tc < 6 &&
        b[tr]?.[tc] === "trap_active"
      ) {
        withTraps.push({
          board: setBoardCell(b, tr, tc, "trap_inactive"),
          entities: e,
        });
      }
    }
  }

  return withTraps;
}

/**
 * Returns all (predecessor, action) pairs such that applyAction(predecessor, action)
 * produces a state with the same stateKey as `state`.
 *
 * Uses a generate-and-verify strategy: generate plausible predecessor board/
 * entity configurations, then confirm each with the forward applyAction oracle.
 */
function generatePredecessors(
  state: GameState,
  burdens: Burdens,
  actions: Action[],
): Array<{ predecessor: GameState; action: Action }> {
  const results: Array<{ predecessor: GameState; action: Action }> = [];
  const targetKey = stateKey(state);
  const { board, entities, player } = state;
  const { row, col, facing, staffContent } = player;

  for (const action of actions) {
    if (action === "staff") {
      const [dr, dc] = DIRECTION_DELTA[facing];
      const fr = row + dr;
      const fc = col + dc;
      if (fr < 0 || fr >= 6 || fc < 0 || fc >= 6) continue;

      const frontCell = board[fr]![fc]!;

      // Reverse of "pick up": staffContent = X, front is empty → pred has empty staff, front = X.
      if (staffContent.length > 0 && frontCell === "empty") {
        const candidate: GameState = {
          board: setBoardCell(board, fr, fc, staffContent[-1] as Cell),
          entities,
          player: { ...player, staffContent: [] },
        };
        const result = applyAction(candidate, "staff", burdens);
        if (result && stateKey(result) === targetKey)
          results.push({ predecessor: candidate, action: "staff" });
      }

      // Reverse of "place": staffContent = empty, front = X → pred has staff = X, front empty.
      // TODO: does not handle the chest→rock staff conversion (rare edge case).
      if (
        (staffContent.length === 0 || burdens.endless) &&
        frontCell !== "empty" &&
        frontCell !== "wall"
      ) {
        const candidate: GameState = {
          board: setBoardCell(board, fr, fc, "empty"),
          entities,
          player: {
            ...player,
            staffContent: [...staffContent, frontCell as StaffContent],
          },
        };
        const result = applyAction(candidate, "staff", burdens);
        if (result && stateKey(result) === targetKey)
          results.push({ predecessor: candidate, action: "staff" });
      }
    } else {
      // Movement action. The player ended up facing `action`, so they moved
      // in that direction — and thus had the same facing before the move.
      if (facing !== action) continue;

      const [dr, dc] = DIRECTION_DELTA[action];
      const srcR = row - dr;
      const srcC = col - dc;
      if (srcR < 0 || srcR >= 6 || srcC < 0 || srcC >= 6) continue;

      const basePlayer = { ...player, row: srcR, col: srcC };

      for (const { board: b, entities: e } of movementCandidates(
        state,
        srcR,
        srcC,
        dr,
        dc,
      )) {
        const candidate: GameState = {
          board: b,
          entities: e,
          player: basePlayer,
        };
        const result = applyAction(candidate, action, burdens);
        if (result && stateKey(result) === targetKey)
          results.push({ predecessor: candidate, action });
      }

      // Wings: player flew from (srcR-dr, srcC-dc) over the gap at (srcR, srcC).
      if (burdens.wings && board[srcR]?.[srcC] === "empty") {
        const src2R = srcR - dr;
        const src2C = srcC - dc;
        if (src2R >= 0 && src2R < 6 && src2C >= 0 && src2C < 6) {
          const basePlayer2 = { ...player, row: src2R, col: src2C };
          for (const { board: b, entities: e } of movementCandidates(
            state,
            src2R,
            src2C,
            dr,
            dc,
          )) {
            const candidate: GameState = {
              board: b,
              entities: e,
              player: basePlayer2,
            };
            const result = applyAction(candidate, action, burdens);
            if (result && stateKey(result) === targetKey)
              results.push({ predecessor: candidate, action });
          }
        }
      }
    }
  }

  return results;
}

/**
 * Bidirectional A* — runs a forward A* from `initial` and a backward A* from
 * all valid goal states simultaneously, meeting in the middle.
 *
 * Memory advantage over unidirectional A*: the effective search depth is
 * roughly halved, so the open/closed sets stay much smaller for deep puzzles.
 *
 * The backward search generates predecessor states via generate-and-verify:
 * plausible predecessor board configurations are proposed and confirmed with
 * the existing forward applyAction oracle.
 */
export async function bidirectionalAStar({
  braneName,
  initial,
  target,
  verbose = 0,
  slow = false,
  requireFinalJump = true,
  burdens = NO_BURDENS,
  actions = ACTIONS,
}: SearchOptions): Promise<SearchResult> {
  const numFloorTilesInSolution = countFloorTiles(target);
  const start = performance.now();
  let nodesExplored = 0;

  // ── Forward search ────────────────────────────────────────────────────────
  const fwdOpen = new MinHeap();
  const fwdClosed = new Map<string, SearchNode>();

  fwdOpen.push({
    state: initial,
    gCost: 0,
    hCost: heuristic(braneName, initial, target, requireFinalJump, burdens).total,
    action: null,
    parent: null,
  });

  // ── Backward search ───────────────────────────────────────────────────────
  const bwdOpen = new MinHeap();
  const bwdClosed = new Map<string, SearchNode>();

  const goalStates = generateGoalStates(
    target,
    initial,
    requireFinalJump,
    burdens.wings,
    burdens.endless,
  );

  if (verbose) {
    console.log(`Backward search: ${goalStates.length} initial goal states`);
    const sample = goalStates.slice(0, 5);
    for (const gs of sample) {
      const entitySummary: string[] = [];
      for (let r = 0; r < 6; r++)
        for (let c = 0; c < 6; c++) {
          const e = gs.entities[r]![c]!;
          if (e !== "empty") entitySummary.push(`${e}@(${r},${c})`);
        }
      console.log(
        `  player=(${gs.player.row},${gs.player.col}) ${gs.player.facing}` +
          ` staff=${gs.player.staffContent}` +
          (entitySummary.length ?
            `  entities=[${entitySummary.join(", ")}]`
          : ""),
      );
    }
    if (goalStates.length > 5)
      console.log(`  … and ${goalStates.length - 5} more`);
  }

  for (const goalState of goalStates) {
    bwdOpen.push({
      state: goalState,
      gCost: 0,
      hCost: heuristic(braneName, goalState, initial.board, false, burdens).total,
      action: null,
      parent: null,
    });
  }

  // First-layer tracking: count how many g=0 backward states produce no valid
  // predecessors (they are "eliminated" — unreachable from the initial state).
  let bwdLayer0Expanded = 0;
  let bwdLayer0Eliminated = 0;
  let bwdLayer0Logged = false;

  let best = Infinity;
  let bestFwdNode: SearchNode | null = null;
  let bestBwdNode: SearchNode | null = null;

  const tryMeeting = (
    node: SearchNode,
    otherClosed: Map<string, SearchNode>,
    nodeIsForward: boolean,
  ): void => {
    const match = otherClosed.get(stateKey(node.state));
    if (!match) return;
    const cost = node.gCost + match.gCost;
    if (cost < best) {
      best = cost;
      bestFwdNode = nodeIsForward ? node : match;
      bestBwdNode = nodeIsForward ? match : node;
    }
  };

  while (fwdOpen.size > 0 || bwdOpen.size > 0) {
    const fwdTop = fwdOpen.peek();
    const bwdTop = bwdOpen.peek();
    const fwdMinF = fwdTop ? fwdTop.gCost + fwdTop.hCost : Infinity;
    const bwdMinF = bwdTop ? bwdTop.gCost + bwdTop.hCost : Infinity;

    // Optimality: the best possible undiscovered path through both frontiers
    // costs at least fwdMinF + bwdMinF.
    if (fwdMinF + bwdMinF >= best) break;

    nodesExplored++;
    if (nodesExplored % 500 === 0)
      await new Promise<void>((resolve) => setImmediate(resolve));
    if (slow) await new Promise<void>((resolve) => setTimeout(resolve, 100));

    if (fwdMinF <= bwdMinF) {
      // ── Expand forward ──────────────────────────────────────────────────
      const current = fwdOpen.pop()!;
      const key = stateKey(current.state);
      if (fwdClosed.has(key)) continue;
      fwdClosed.set(key, current);

      tryMeeting(current, bwdClosed, true);

      if (isGoal(current.state, target, requireFinalJump)) {
        if (current.gCost < best) {
          best = current.gCost;
          bestFwdNode = current;
          bestBwdNode = null;
        }
        break;
      }

      if (
        isPruned(
          current.state,
          target,
          burdens,
          numFloorTilesInSolution,
          initial,
        )
      )
        continue;

      for (const action of actions) {
        const next = applyAction(current.state, action, burdens);
        if (!next) continue;
        if (fwdClosed.has(stateKey(next))) continue;

        fwdOpen.push({
          state: next,
          gCost: current.gCost + 1,
          hCost: heuristic(braneName, next, target, requireFinalJump, burdens).total,
          action,
          parent: current,
        });
      }
    } else {
      // ── Expand backward ─────────────────────────────────────────────────
      const current = bwdOpen.pop()!;
      const key = stateKey(current.state);
      if (bwdClosed.has(key)) continue;
      bwdClosed.set(key, current);

      // When we first encounter a g=1 backward node, the entire g=0 layer has
      // been committed to the closed set — print the first-layer summary.
      if (verbose && !bwdLayer0Logged && current.gCost > 0) {
        console.log(
          `Backward layer 0: ${bwdLayer0Expanded} expanded, ` +
            `${bwdLayer0Eliminated} eliminated (no valid predecessors), ` +
            `${bwdLayer0Expanded - bwdLayer0Eliminated} produced successors`,
        );
        bwdLayer0Logged = true;
      }

      tryMeeting(current, fwdClosed, false);

      const preds = generatePredecessors(current.state, burdens, actions);

      if (current.gCost === 0) {
        bwdLayer0Expanded++;
        if (preds.length === 0) bwdLayer0Eliminated++;
      }

      for (const { predecessor, action } of preds) {
        if (bwdClosed.has(stateKey(predecessor))) continue;

        bwdOpen.push({
          state: predecessor,
          gCost: current.gCost + 1,
          hCost: heuristic(braneName, predecessor, initial.board, false, burdens).total,
          action,
          parent: current,
        });
      }
    }
  }

  const elapsedMs = performance.now() - start;

  if (verbose) {
    // If the search ended before any g=1 backward node was processed, the
    // layer-0 summary was never printed mid-loop — emit it now.
    if (!bwdLayer0Logged && bwdLayer0Expanded > 0) {
      console.log(
        `Backward layer 0: ${bwdLayer0Expanded} expanded, ` +
          `${bwdLayer0Eliminated} eliminated (no valid predecessors), ` +
          `${bwdLayer0Expanded - bwdLayer0Eliminated} produced successors`,
      );
    } else if (!bwdLayer0Logged && bwdLayer0Expanded === 0) {
      console.log(
        `Backward layer 0: no backward states were expanded (forward search solved it first)`,
      );
    }
    console.log(
      `Bidirectional A* | ${nodesExplored} nodes | ${elapsedMs.toFixed(0)}ms` +
        (best < Infinity ? ` | path=${best}` : " | no solution"),
    );
  }

  if (best === Infinity) return { path: null, nodesExplored, elapsedMs };

  if (bestBwdNode === null) {
    // Goal found directly by forward search.
    return { path: reconstructPath(bestFwdNode!), nodesExplored, elapsedMs };
  }

  // Combine forward path (initial → meeting) with backward path (meeting → goal).
  // reconstructPath walks parent pointers collecting the `action` at each node.
  // For the backward node, parent points toward the goal, so reconstructPath
  // yields the forward actions needed to traverse from meeting to goal.
  return {
    path: [...reconstructPath(bestFwdNode!), ...reconstructPath(bestBwdNode!)],
    nodesExplored,
    elapsedMs,
  };
}
