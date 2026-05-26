#!/usr/bin/env node

import { parseArgs } from "node:util";
import { replayPath } from "./gameState";
import { BRANES, BRANDS } from "./levels";
import { search } from "./search";
import { emptyEntityGrid, parseBoard, parseEntities } from "./utils";
import type { Board, GameState } from "./types";

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    help: { type: "boolean", short: "h" },
    brane: { type: "string", short: "e" },
    brand: { type: "string", short: "d" },
    verbose: { type: "boolean", short: "v" },
    slow: { type: "boolean", short: "s" },
  },
});

if (values.help) {
  const be_list = BRANES.map((l) => `  ${l.name}`).join("\n");
  const bd_list = BRANDS.map((l) => `  ${l.name}`).join("\n");
  console.log(`Usage: void-stranger-brand-solver [options]

Options:
  -h, --help           Show this help message
  -be, --brane <name>   Level to solve (default: Add)
  -bd, --brand <name>   Brand to carve (default: Add)
  -v, --verbose        Print each board state during solution replay

Available branes:
${be_list}

Available brands:
${bd_list}

Board encoding: " " empty  "#" floor  "G" glass  "S" stairs
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

async function main() {
  console.log("Searching for solution...");
  const start = performance.now();
  const { path, nodesExplored } = await search(
    INITIAL_STATE,
    TARGET_BOARD,
    values.verbose,
    values.slow,
  );
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
  console.log(path.join(", "));

  if (values.verbose) replayPath(INITIAL_STATE, path, TARGET_BOARD);
}

main();
