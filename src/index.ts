#!/usr/bin/env node

import { parseArgs } from "node:util";
import { replayPath } from "./gameState";
import { LEVELS } from "./levels";
import { search } from "./search";
import { parseBoard } from "./solve";
import type { Board, GameState } from "./types";

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    help: { type: "boolean", short: "h" },
    brand: { type: "string", short: "b" },
    verbose: { type: "boolean", short: "v" },
    slow: { type: "boolean", short: "s" },
  },
});

if (values.help) {
  const list = LEVELS.map((l) => `  ${l.name}`).join("\n");
  console.log(`Usage: void-stranger-brand-solver [options]

Options:
  -h, --help           Show this help message
  -b, --brand <name>   Level to solve (default: Add)
  -v, --verbose        Print each board state during solution replay

Available levels:
${list}

Board encoding: " " empty  "#" floor  "G" glass  "S" stairs
`);
  process.exit(0);
}

const rawLevel = values.brand
  ? LEVELS.find((l) => l.name === values.brand)
  : LEVELS[0];

if (!rawLevel) {
  console.error(`Unknown brand: "${values.brand}"`);
  process.exit(1);
}

const INITIAL_STATE: GameState = {
  board: parseBoard(rawLevel.initial.board),
  player: rawLevel.initial.player,
};
const TARGET_BOARD: Board = parseBoard(rawLevel.target);

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
