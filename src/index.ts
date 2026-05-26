#!/usr/bin/env node

import { parseArgs } from "node:util";
import { replayPath } from "./gameState";
import { BRANES, BRANDS, KNOWN_CORRECT_PATHS } from "./levels";
import { search } from "./search";
import {
  actionsToString,
  emptyEntityGrid,
  parseBoard,
  parseEntities,
} from "./utils";
import type { Action, Board, GameState } from "./types";

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    help: { type: "boolean", short: "h" },
    brane: { type: "string", short: "e" },
    brand: { type: "string", short: "d" },
    wings: { type: "boolean" },
    initialThreshold: { type: "string" },
    cheatFirstNSteps: { type: "string" },
    verbose: { type: "string", short: "v" },
    slow: { type: "boolean", short: "s" },
  },
});

if (values.help) {
  const be_list = BRANES.map((l) => `  ${l.name}`).join("\n");
  const bd_list = BRANDS.map((l) => `  ${l.name}`).join("\n");
  console.log(`Usage: void-stranger-brand-solver [options]

Options:
  -h, --help                      Show this help message
  -e, --brane <name>              Brane (level) to solve
  -d, --brand <name>              Brand to carve
      --wings                     Enable wings mechanic
  -v, --verbose <level>           Verbosity level: 1 = log search progress, 2 = replay solution
  -s, --slow                      Add 100ms delay per node during search
      --initialThreshold <n>      Override initial IDA* cost threshold
      --cheatFirstNSteps <n>      Skip first N steps using the known correct path

Available branes:
${be_list}

Available brands:
${bd_list}

Board encoding: " " empty  "#" floor  "G" glass  "S" stairs  "W" wall  "B" button  "T" inactive trap  "A" active trap
`);
  process.exit(0);
}

const rawLevel = BRANES.find((l) => l.name === values.brane);

if (!rawLevel) {
  console.error(`Unknown brane: "${values.brane}"`);
  process.exit(1);
}

const rawBrand = BRANDS.find((l) => l.name === values.brand);

if (!rawBrand) {
  console.error(`Unknown brand: "${values.brand}"`);
  process.exit(1);
}

const INITIAL_STATE: GameState = {
  board: parseBoard(rawLevel.board),
  entities: rawLevel.entities
    ? parseEntities(rawLevel.entities)
    : emptyEntityGrid(),
  player: rawLevel.player,
};
const TARGET_BOARD: Board = parseBoard(rawBrand.board);

const initialThreshold = values.initialThreshold
  ? Number(values.initialThreshold)
  : undefined;

const scenarioName = `${values.brane}/${values.brand}${
  values.wings ? " wings" : ""
}`;
const knownCorrectPath = (KNOWN_CORRECT_PATHS[scenarioName] || "")
  .split("")
  .map((l) => {
    return {
      L: "left",
      R: "right",
      U: "up",
      D: "down",
      Z: "staff",
    }[l] as Action;
  });

async function main() {
  console.log(
    `Searching for solution... ${scenarioName}, known path is ${KNOWN_CORRECT_PATHS[scenarioName]}`,
  );
  const start = performance.now();
  const { path, nodesExplored } = await search({
    initial: INITIAL_STATE,
    target: TARGET_BOARD,
    verbose: Number(values.verbose),
    slow: values.slow ?? false,
    requireFinalJump: true,
    initialThreshold,
    knownCorrectPath,
    hasWings: values.wings ?? false,
  });
  const elapsedMs = performance.now() - start;
  const nodesPerSec = Math.round((nodesExplored / elapsedMs) * 1000);
  const perf = `${elapsedMs.toFixed(
    1,
  )}ms | ${nodesExplored} nodes | ${nodesPerSec} nodes/sec`;

  if (!path) {
    console.log(`No solution found. (${perf})`);
    return;
  }

  console.log(`Solution found in ${path.length} steps (${perf}):`);
  console.log(actionsToString(path));

  if (values.verbose) replayPath(INITIAL_STATE, path, TARGET_BOARD);
}

main();
