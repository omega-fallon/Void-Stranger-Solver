import {
  ACTIONS,
  applyAction,
  isGoal,
  renderState,
  stateKey,
} from "../gameState";
import { heuristic } from "../heuristic";
import { MinHeap } from "../priorityQueue";
import { NO_BURDENS } from "../types";
import type { Action, Board, Burdens, GameState, SearchNode } from "../types";
import { actionsToString } from "../utils";
import { idaDfs } from "./idaStar";
import { reconstructPath } from "./aStar";
import {
  countFloorTiles,
  isPruned,
  type DfsCounters,
  type SearchOptions,
  type SearchResult,
} from "./shared";

/**
 * Expands the search tree best-first (A*) up to `frontierDepth` layers, then
 * stops without expanding those nodes further.  Returns the accumulated frontier
 * (nodes at exactly `frontierDepth`) in f-ascending order, plus any goal states
 * discovered before reaching that depth.
 *
 * Using A* ordering guarantees that the frontier nodes with the lowest f-values
 * — i.e. the most promising entry points for the IDA* tail — come first.
 */
function buildFrontier(
  initial: GameState,
  frontierDepth: number,
  target: Board,
  burdens: Burdens,
  numFloorTilesInSolution: number,
  requireFinalJump: boolean,
  actions: Action[],
): { frontier: SearchNode[]; earlyGoals: SearchNode[] } {
  const open = new MinHeap();
  const closed = new Set<string>();
  const frontier: SearchNode[] = [];
  const earlyGoals: SearchNode[] = [];

  const initialH = heuristic(initial, target, requireFinalJump).total;
  open.push({
    state: initial,
    gCost: 0,
    hCost: initialH,
    action: null,
    parent: null,
  });

  while (open.size > 0) {
    const current = open.pop()!;
    const key = stateKey(current.state);
    if (closed.has(key)) continue;
    closed.add(key);

    // Goal found before the frontier depth.
    if (isGoal(current.state, target, requireFinalJump)) {
      earlyGoals.push(current);
      continue;
    }

    // Reached the frontier — don't expand further.
    if (current.gCost >= frontierDepth) {
      frontier.push(current);
      continue;
    }

    // Dead end — skip entirely.
    if (isPruned(current.state, target, burdens, numFloorTilesInSolution))
      continue;

    for (const action of actions) {
      const next = applyAction(current.state, action, burdens);
      if (!next) continue;
      if (closed.has(stateKey(next))) continue;

      const nextH = heuristic(next, target, requireFinalJump).total;
      open.push({
        state: next,
        gCost: current.gCost + 1,
        hCost: nextH,
        action,
        parent: current,
      });
    }
  }

  // Nodes are accumulated as they're popped from the min-heap, so the array
  // is already in f-ascending order — best frontier candidates first.
  return { frontier, earlyGoals };
}

/**
 * Replays `prefixActions` from `initial` and returns the set of all state keys
 * visited along the path (inclusive of start and end).  Used to seed each IDA*
 * sub-search's visited set so it cannot cycle back through the A* prefix.
 */
function buildPrefixVisited(
  initial: GameState,
  prefixActions: Action[],
  burdens: Burdens,
): Set<string> {
  const visited = new Set<string>();
  let state = initial;
  visited.add(stateKey(state));
  for (const action of prefixActions) {
    state = applyAction(state, action, burdens)!;
    visited.add(stateKey(state));
  }
  return visited;
}

/**
 * Hybrid A* + IDA* search.
 *
 * Phase 1 — A* frontier expansion:
 *   Run A* (best-first, consistent heuristic) for exactly `frontierDepth` layers.
 *   This produces a frontier of states explored in f-value order, guaranteeing
 *   that the opening moves — the main source of IDA*'s wasted re-exploration —
 *   are chosen optimally rather than DFS-arbitrarily.  Memory cost is
 *   O(branching^frontierDepth); with pruning and frontierDepth=10 this is
 *   typically tens of thousands of states.
 *
 * Phase 2 — IDA* tails:
 *   Launch an independent IDA* sub-search from each frontier node, with the
 *   sub-threshold set to (globalThreshold − g_frontier).  The sub-searches share
 *   a single counter object for combined node statistics.  They are tried in
 *   f-ascending order so the most promising frontier node is explored first.
 *
 * Threshold management:
 *   Works identically to standalone IDA*: if no sub-search finds a solution at
 *   the current threshold, the minimum f-value that exceeded any sub-threshold
 *   (plus that sub-search's frontier depth) becomes the next global threshold.
 *
 * `frontierDepth` (default 10): how many A* layers to expand before switching
 *   to IDA*.  Larger values give better opening-move quality but use more memory.
 */
export async function aStarThenIdaStar({
  initial,
  target,
  verbose = 0,
  slow = false,
  requireFinalJump = true,
  initialThreshold,
  knownCorrectPath = [],
  burdens = NO_BURDENS,
  actions = ACTIONS,
  frontierDepth = 10,
}: SearchOptions): Promise<SearchResult> {
  const numFloorTilesInSolution = countFloorTiles(target);
  const showProgress = verbose >= 2;

  const counters: DfsCounters = {
    nodesExplored: 0,
    loopsPrevented: 0,
    pathsTrimmed: 0,
  };
  const start = performance.now();
  let lastLogTime = 0;

  // ── Phase 1: build frontier once (reused across all threshold iterations) ──

  if (verbose) console.log(`Building A* frontier to depth ${frontierDepth}...`);

  const { frontier, earlyGoals } = buildFrontier(
    initial,
    frontierDepth,
    target,
    burdens,
    numFloorTilesInSolution,
    requireFinalJump,
    actions,
  );

  if (verbose)
    console.log(
      `Frontier built: ${frontier.length} nodes, ${earlyGoals.length} early goals.`,
    );

  // If the goal was reachable within frontierDepth steps, return immediately.
  if (earlyGoals.length > 0) {
    // earlyGoals are accumulated in f-order; the first is optimal.
    const best = earlyGoals[0]!;
    return {
      path: reconstructPath(best),
      nodesExplored: counters.nodesExplored,
      elapsedMs: performance.now() - start,
    };
  }

  // Pre-compute the prefix path and visited-state set for every frontier node.
  // These are stable across threshold iterations, so we only pay this cost once.
  const frontierInfo = frontier.map((node) => {
    const prefixActions = reconstructPath(node);
    return {
      node,
      prefixActions,
      prefixVisited: buildPrefixVisited(initial, prefixActions, burdens),
    };
  });

  // ── Phase 2: IDA* tails with iterative threshold ────────────────────────

  let threshold =
    initialThreshold ?? heuristic(initial, target, requireFinalJump).total;

  while (true) {
    let minNextThreshold = Infinity;

    if (showProgress) {
      console.log(
        `Threshold ${threshold} | Launching IDA* tails from ${frontier.length} frontier nodes...`,
      );
    }

    for (const { node, prefixActions, prefixVisited } of frontierInfo) {
      const nodeFCost = node.gCost + node.hCost;

      // This frontier node's f already exceeds the threshold — it would have
      // been pruned by IDA* at this threshold, so skip but record for next round.
      if (nodeFCost > threshold) {
        minNextThreshold = Math.min(minNextThreshold, nodeFCost);
        continue;
      }

      // Sub-threshold: how much depth budget remains after the A* prefix.
      const subThreshold = threshold - node.gCost;

      // Run IDA* from this frontier node.  The visited set is seeded with the
      // prefix path states so the sub-search cannot cycle back through them.
      // idaDfs backtracks cleanly on failure, leaving prefixVisited unchanged.
      const subPath: Action[] = [];
      const result = await idaDfs(
        node.state,
        0,
        subPath,
        subThreshold,
        prefixVisited,
        target,
        burdens,
        numFloorTilesInSolution,
        requireFinalJump,
        counters,
        actions,
        async (state, subPath, g, h) => {
          const now = performance.now();
          if (showProgress && (verbose >= 3 || now - lastLogTime >= 3000)) {
            lastLogTime = now;
            const elapsedMs = now - start;
            const nodesPerSec = Math.round(
              (counters.nodesExplored / elapsedMs) * 1000,
            );
            const fullPath = [...prefixActions, ...subPath];
            const action = fullPath.at(-1) ?? "start";

            const amountOfPathFound = (() => {
              for (let i = 0; i < knownCorrectPath.length; i++) {
                if (knownCorrectPath[i] != fullPath[i]) return i;
              }
              return knownCorrectPath.length;
            })();

            console.log(
              `Threshold: ${threshold} | Frontier node: ${node.gCost}g+${node.hCost}h | IDA* depth: ${g} | ` +
                `Explored: ${counters.nodesExplored} | ${(elapsedMs / 1000).toFixed(0)}s | ${nodesPerSec} nodes/sec\n` +
                `Full path: ${node.gCost + g} steps | ${amountOfPathFound} correct: ${actionsToString(fullPath)} / ${actionsToString(knownCorrectPath)}\n` +
                `Action: ${action}\n` +
                `${renderState(state, numFloorTilesInSolution)}`,
            );
          }

          if (slow)
            await new Promise<void>((resolve) => setTimeout(resolve, 100));

          if (isGoal(state, target, requireFinalJump)) return "found";
          return "continue";
        },
      );

      if (result === "found") {
        const elapsedMs = performance.now() - start;
        if (verbose) {
          console.log(
            `A*+IDA* done | ${counters.nodesExplored} nodes | ${elapsedMs.toFixed(0)}ms | ${(
              counters.nodesExplored /
              (elapsedMs / 1000)
            ).toFixed(0)} nodes/sec`,
          );
        }
        return {
          path: [...prefixActions, ...subPath],
          nodesExplored: counters.nodesExplored,
          elapsedMs,
        };
      }

      if (result !== Infinity) {
        // `result` is the minimum relative f that exceeded subThreshold in the
        // sub-search.  The global f of that node is node.gCost + result.
        minNextThreshold = Math.min(minNextThreshold, node.gCost + result);
      }
    }

    const elapsedMs = performance.now() - start;
    if (verbose) {
      console.log(
        `--- Threshold ${threshold} exhausted | ${
          counters.nodesExplored
        } nodes | ${elapsedMs.toFixed(0)}ms | ${(
          counters.nodesExplored /
          (elapsedMs / 1000)
        ).toFixed(0)} nodes/sec ---`,
      );
    }

    if (minNextThreshold === Infinity) {
      return {
        path: null,
        nodesExplored: counters.nodesExplored,
        elapsedMs,
      };
    }

    threshold = minNextThreshold;
  }
}
