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

async function main() {
  const rawBrane = BRANES.find((l) => l.name === "Eus")!;
  const rawBrand = BRANDS.find((l) => l.name === "Eus")!;

  const initial = {
    board: parseBoard(rawBrane.board),
    entities: emptyEntityGrid(),
    player: rawBrane.player,
  };
  const target = parseBoard(rawBrand.board);

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

  const divider = "─".repeat(44);
  console.log(`\n${divider}`);
  console.log(`Rank  Order   ${"Nodes".padStart(14)}   Time`);
  console.log(divider);
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
  console.log(divider);
}

main();
