#!/usr/bin/env node

import { parseArgs } from "node:util";
import { applyAction, isGoal, renderBoard } from "./gameState";
import { aStar } from "./search";
import type { Board, GameState } from "./types";

const TARGET_BOARD: Board = [
  ["floor",  "empty", "empty", "empty", "empty", "floor" ],
  ["empty",  "empty", "empty", "floor", "floor", "empty" ],
  ["empty",  "floor", "floor", "floor", "floor", "floor" ],
  ["floor",  "floor", "floor", "floor", "floor", "empty" ],
  ["empty",  "floor", "floor", "empty", "empty", "empty" ],
  ["floor",  "empty", "empty", "empty", "empty", "floor" ],
];

const INITIAL_STATE: GameState = {
  board: [
    ["floor",  "empty", "empty", "stairs", "empty", "floor" ],
    ["empty",  "empty", "empty", "floor",  "floor", "empty" ],
    ["empty",  "floor", "floor", "floor",  "floor", "floor" ],
    ["floor",  "floor", "floor", "floor",  "floor", "empty" ],
    ["empty",  "floor", "floor", "empty",  "empty", "empty" ],
    ["floor",  "empty", "empty", "empty",  "empty", "floor" ],
  ],
  player: { row: 3, col: 2, facing: "down", staffContent: "empty" },
};

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    help: { type: "boolean", short: "h" },
    verbose: { type: "boolean", short: "v" },
  },
});

if (values.help) {
  console.log(`Usage: void-stranger-brand-solver [options]

Options:
  -h, --help     Show this help message
  -v, --verbose  Print each board state during solution replay

Board legend: # floor  G glass  S stairs  @ player  . empty
Mismatch marker: ! (cell differs from target)
`);
  process.exit(0);
}

function main() {
  console.log("Searching for solution...");
  const path = aStar(INITIAL_STATE, TARGET_BOARD, values.verbose);

  if (!path) {
    console.log("No solution found.");
    return;
  }

  console.log(`Solution found in ${path.length} steps:`);
  console.log(path.join(", "));

  if (values.verbose) {
    console.log("\n--- Solution replay ---");
    let state = INITIAL_STATE;
    console.log(`\nStep 0 (initial):\n${renderBoard(state)}\n`);
    for (let i = 0; i < path.length; i++) {
      const action = path[i]!;
      state = applyAction(state, action)!;
      console.log(`Step ${i + 1}: ${action}\n${renderBoard(state)}\n`);
      if (isGoal(state, TARGET_BOARD)) console.log("Goal reached!");
    }
  }
}

main();
