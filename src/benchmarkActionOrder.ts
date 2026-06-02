import { BRANES, BRANDS } from "./levels";
import { search } from "./search";
import { parseBoard, emptyEntityGrid, actionsToString } from "./utils";
import type { Action } from "./types";

function permutations<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [arr.slice()];
  return arr.flatMap((item, i) =>
    permutations([...arr.slice(0, i), ...arr.slice(i + 1)]).map((p) => [
      item,
      ...p,
    ]),
  );
}

// ── Symmetry helpers ──────────────────────────────────────────────────────────

const swapLR = (a: Action): Action =>
  a === "left" ? "right"
  : a === "right" ? "left"
  : a;

const swapUD = (a: Action): Action =>
  a === "up" ? "down"
  : a === "down" ? "up"
  : a;

/**
 * Returns the lexicographically smallest label among a permutation and its
 * three symmetric variants (L↔R swap, U↔D swap, both), so that all four map
 * to the same canonical key.
 */
function canonicalKey(actions: Action[]): string {
  return [
    actions,
    actions.map(swapLR),
    actions.map(swapUD),
    actions.map((a) => swapLR(swapUD(a))),
  ]
    .map(actionsToString)
    .sort()[0]!;
}

async function main() {
  const rawBrane = BRANES.find((l) => l.name === "Eus")!;
  const rawBrand = BRANDS.find((l) => l.name === "Eus")!;

  const initial = {
    board: rawBrane.board,
    entities: emptyEntityGrid(),
    player: rawBrane.player,
  };
  const target = rawBrand.board;

  const BASE_ACTIONS: Action[] = ["left", "right", "up", "down", "staff"];
  const allPerms = permutations(BASE_ACTIONS);

  console.log(
    `Running Eus/Eus search for all ${allPerms.length} action orderings at threshold 26...`,
  );

  type BenchResult = {
    actions: Action[];
    nodesExplored: number;
    elapsedMs: number;
    found: boolean;
  };

  const results: BenchResult[] = [];

  for (let i = 0; i < allPerms.length; i++) {
    const actions = allPerms[i]!;
    const label = actionsToString(actions);
    process.stdout.write(`[${i + 1}/${allPerms.length}] ${label}... `);

    const { path, nodesExplored, elapsedMs } = await search({
      initial,
      target,
      actions,
      initialThreshold: 26,
      requireFinalJump: true,
    });

    results.push({ actions, nodesExplored, elapsedMs, found: path !== null });
    process.stdout.write(
      `${nodesExplored.toLocaleString()} nodes (${(elapsedMs / 1000).toFixed(
        1,
      )}s)${path ? "" : " [no solution]"}\n`,
    );
  }

  results.sort((a, b) => a.nodesExplored - b.nodesExplored);

  // ── Grouped by symmetry (L↔R, U↔D) ────────────────────────────────────────

  const groupMap = new Map<string, BenchResult[]>();
  for (const r of results) {
    const key = canonicalKey(r.actions);
    const g = groupMap.get(key) ?? [];
    g.push(r);
    groupMap.set(key, g);
  }

  const groups = [...groupMap.values()]
    .map((members) => ({
      // Sort members alphabetically by label so the display is deterministic.
      members: [...members].sort((a, b) =>
        actionsToString(a.actions).localeCompare(actionsToString(b.actions)),
      ),
      avgNodes: Math.round(
        members.reduce((sum, r) => sum + r.nodesExplored, 0) / members.length,
      ),
    }))
    .sort((a, b) => a.avgNodes - b.avgNodes);

  const div1 = "─".repeat(52);
  console.log(
    `\n=== Grouped by L↔R / U↔D symmetry (${groups.length} groups) ===`,
  );
  console.log(div1);
  console.log(`Rank   ${"Avg Nodes".padStart(14)}   Equivalent orderings`);
  console.log(div1);
  for (let i = 0; i < groups.length; i++) {
    const { members, avgNodes } = groups[i]!;
    const rank = String(i + 1).padStart(3);
    const avgStr = avgNodes.toLocaleString().padStart(14);
    const labels = members.map((m) => actionsToString(m.actions)).join("  ");
    console.log(`${rank}.  ${avgStr}   ${labels}`);
  }
  console.log(div1);

  // ── Full individual ranking ─────────────────────────────────────────────────

  const div2 = "─".repeat(44);
  console.log(`\n=== All ${results.length} orderings ===`);
  console.log(div2);
  console.log(`Rank  Order   ${"Nodes".padStart(14)}   Time`);
  console.log(div2);
  for (let i = 0; i < results.length; i++) {
    const { actions, nodesExplored, elapsedMs, found } = results[i]!;
    const rank = String(i + 1).padStart(3);
    const label = actionsToString(actions);
    const nodesStr = nodesExplored.toLocaleString().padStart(14);
    const timeStr = `${(elapsedMs / 1000).toFixed(1)}s`.padStart(6);
    console.log(
      `${rank}.  ${label}  ${nodesStr}   ${timeStr}${
        found ? "" : "  [no solution]"
      }`,
    );
  }
  console.log(div2);
}

main();
