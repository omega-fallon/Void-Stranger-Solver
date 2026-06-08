import {
  ACTIONS,
  applyAction,
  isGoal,
  renderState,
  stateKey,
} from "../gameState";
import { heuristic } from "../heuristic";
import { NO_BURDENS } from "../types";
import type { Action, Board, Burdens, GameState } from "../types";
import { actionsToString } from "../utils";
import {
  countFloorTiles,
  isPruned,
  type DfsCounters,
  type SearchOptions,
  type SearchResult,
} from "./shared";

/**
 * RBFS (Recursive Best-First Search) kernel.
 *
 * Unlike IDA*, RBFS tracks the f-value of the best unexplored alternative at
 * each level.  When a subtree is abandoned (its best node exceeds the limit),
 * RBFS returns the minimum f seen inside that subtree.  The parent records
 * this as the subtree's new cost and only re-enters it once it becomes the
 * globally cheapest option again.  This avoids IDA*'s redundant re-exploration
 * of the same early prefixes across many threshold iterations.
 *
 * Parameters:
 *   `f`      — the f-value of this node as computed by its parent (may exceed
 *              g+h when boosted to be non-decreasing along the path).
 *   `fLimit` — do not expand any node whose f exceeds this bound; return the
 *              cheapest f seen in the subtree so the parent can update its record.
 *
 * Returns:
 *   "found"  — goal reached; `path` contains the solution.
 *   number   — the minimum f-value seen in this subtree (Infinity = dead end).
 */
async function rbfsDfs(
  state: GameState,
  g: number,
  f: number,
  fLimit: number,
  path: Action[],
  visited: Set<string>,
  target: Board,
  burdens: Burdens,
  numFloorTilesInSolution: number,
  requireFinalJump: boolean,
  counters: DfsCounters,
  actions: Action[],
  onNode: (
    state: GameState,
    path: Action[],
    g: number,
    h: number,
  ) => Promise<"found" | "continue">,
): Promise<"found" | number> {
  // Exceeded the current limit — report our f so the parent can record it.
  if (f > fLimit) return f;

  // Compute h separately for accurate logging (f may have been boosted above g+h).
  const h = heuristic(state, target, requireFinalJump).total;

  counters.nodesExplored++;

  // Take an async break for unit tests to be able to cancel the run
  if (counters.nodesExplored % 500 === 0)
    await new Promise<void>((resolve) => setImmediate(resolve));

  // Check for goal / request logging before pruning, so that landing on the
  // solution after falling into a watcher is handled correctly.
  const nodeDecision = await onNode(state, path, g, h);
  if (nodeDecision === "found") return "found";

  if (isPruned(state, target, burdens, numFloorTilesInSolution))
    return Infinity;

  // Build the successor list, computing each child's f up-front so we can sort.
  type Successor = { state: GameState; action: Action; f: number; key: string };
  const successors: Successor[] = [];

  for (const action of actions) {
    const next = applyAction(state, action, burdens);
    if (!next) continue;

    const key = stateKey(next);
    if (visited.has(key)) {
      counters.loopsPrevented++;
      continue;
    }

    const nextH = heuristic(next, target, requireFinalJump).total;
    // Ensure f is non-decreasing along any path (required for RBFS correctness
    // when the heuristic is consistent, which it should be here).
    // TODO: But our heuristic isn't quite consistent; is that a problem?
    const childF = Math.max(g + 1 + nextH, f);
    successors.push({ state: next, action, f: childF, key });
  }

  if (successors.length === 0) return Infinity;

  // Sort ascending by f — best candidate first.
  successors.sort((a, b) => a.f - b.f);

  while (true) {
    const best = successors[0]!;

    // All remaining successors exceed the current limit.
    // Return the cheapest so the parent can decide when to re-visit.
    if (best.f > fLimit) return best.f;

    // Bound this subtree by the smaller of our limit and the next-best sibling.
    const alternative = successors[1]?.f ?? Infinity;
    const newLimit = Math.min(fLimit, alternative);

    visited.add(best.key);
    path.push(best.action);

    const result = await rbfsDfs(
      best.state,
      g + 1,
      best.f,
      newLimit,
      path,
      visited,
      target,
      burdens,
      numFloorTilesInSolution,
      requireFinalJump,
      counters,
      actions,
      onNode,
    );

    if (result === "found") return "found";

    path.pop();
    visited.delete(best.key);

    // Update this successor's recorded f with the best cost found in its subtree,
    // then re-sort so the new best rises to the front.
    best.f = result;
    successors.sort((a, b) => a.f - b.f);
  }
}

/**
 * RBFS search entry point.
 *
 * Note: `initialThreshold` is not used by RBFS — the algorithm manages its own
 * internal f-limits and does not need the iterative-deepening outer loop that
 * IDA* uses.  Pass `algorithm: "idaStar"` if you need threshold control.
 */
export async function rbfs({
  initial,
  target,
  verbose = 0,
  slow = false,
  requireFinalJump = true,
  knownCorrectPath = [],
  burdens = NO_BURDENS,
  actions = ACTIONS,
}: SearchOptions): Promise<SearchResult> {
  const numFloorTilesInSolution = countFloorTiles(target);
  const showProgress = verbose >= 2;

  const counters: DfsCounters = {
    nodesExplored: 0,
    loopsPrevented: 0,
    pathsTrimmed: 0,
  };
  const start = performance.now();
  // Initialised to 0 so the first log fires immediately rather than waiting 3s.
  let lastLogTime = 0;

  const visited = new Set<string>();
  visited.add(stateKey(initial));

  const path: Action[] = [];
  const initialH = heuristic(initial, target, requireFinalJump).total;

  const result = await rbfsDfs(
    initial,
    0,
    initialH,
    Infinity,
    path,
    visited,
    target,
    burdens,
    numFloorTilesInSolution,
    requireFinalJump,
    counters,
    actions,
    async (state, path, g, h) => {
      const now = performance.now();
      if (showProgress && (verbose >= 3 || now - lastLogTime >= 3000)) {
        lastLogTime = now;
        const elapsedMs = now - start;
        const nodesPerSec = Math.round(
          (counters.nodesExplored / elapsedMs) * 1000,
        );
        const action = path.at(-1) ?? "start";

        const amountOfPathFound = (() => {
          for (let i = 0; i < knownCorrectPath.length; i++) {
            if (knownCorrectPath[i] != path[i]) return i;
          }
          return knownCorrectPath.length;
        })();

        console.log(
          `Explored: ${counters.nodesExplored} | ${counters.loopsPrevented} loops prevented | ` +
            `${(elapsedMs / 1000).toFixed(0)}s | ${nodesPerSec} nodes/sec\n` +
            `Path: ${g} | f=${g + h} (${g}g+${h}h) | ${amountOfPathFound} correct: ${actionsToString(path)} / ${actionsToString(knownCorrectPath)}\n` +
            `Action: ${action}\n` +
            `${renderState(state, numFloorTilesInSolution)}`,
        );
      }

      if (slow) await new Promise<void>((resolve) => setTimeout(resolve, 100));

      if (isGoal(state, target, requireFinalJump)) return "found";
      return "continue";
    },
  );

  const elapsedMs = performance.now() - start;
  if (verbose) {
    console.log(
      `RBFS complete | result: ${result} | ${
        counters.nodesExplored
      } nodes | ${elapsedMs.toFixed(0)}ms | ${(
        counters.nodesExplored /
        (elapsedMs / 1000)
      ).toFixed(0)} nodes/sec`,
    );
  }

  if (result === "found")
    return { path, nodesExplored: counters.nodesExplored, elapsedMs };
  return { path: null, nodesExplored: counters.nodesExplored, elapsedMs };
}
