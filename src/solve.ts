#!/usr/bin/env node

import { parseArgs } from "node:util";
import type { Board, Cell } from "./types";
import { LEVELS } from "./levels";
import { aStar } from "./search";

export function parseBoard(rows: string[]): Board {
  const charToCell: Record<string, Cell> = {
    " ": "empty",
    "#": "floor",
    G: "glass",
    S: "stairs",
  };
  return rows.map((row) =>
    Array.from(row).map((ch) => {
      const cell = charToCell[ch];
      if (cell === undefined)
        throw new Error(`Unknown tile character: "${ch}"`);
      return cell;
    })
  );
}

if (require.main === module) {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      help: { type: "boolean", short: "h" },
      level: { type: "string", short: "l" },
      verbose: { type: "boolean", short: "v" },
    },
  });

  if (values.help) {
    const list = LEVELS.map((l) => `  ${l.name}`).join("\n");
    console.log(`Usage: solve [options]

Options:
  -h, --help           Show this help message
  -l, --level <name>   Run a specific level by name (default: run all)
  -v, --verbose        Show search exploration log

Available levels:
${list}
`);
    process.exit(0);
  }

  const levelsToRun = values.level
    ? LEVELS.filter((l) => l.name === values.level)
    : LEVELS;

  if (values.level && levelsToRun.length === 0) {
    console.error(`Unknown level: "${values.level}"`);
    process.exit(1);
  }

  for (const raw of levelsToRun) {
    const initial = {
      board: parseBoard(raw.initial.board),
      player: raw.initial.player,
    };
    const target = parseBoard(raw.target);

    console.log(`\n=== ${raw.name} ===`);
    const start = performance.now();
    const path = aStar(initial, target, values.verbose);
    const elapsed = (performance.now() - start).toFixed(1);

    if (!path) {
      console.log(`No solution found. (${elapsed}ms)`);
    } else {
      console.log(`Solved in ${path.length} steps (${elapsed}ms):`);
      console.log(path.join(", "));
    }
  }
}
