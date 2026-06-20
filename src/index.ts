#!/usr/bin/env node

import { parseArgs } from "node:util";
import { applyAction, renderState, replayPath } from "./gameState";
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
    sword: { type: "boolean" },
    endless: { type: "boolean" },
    initialThreshold: { type: "string" },
    cheatFirstNSteps: { type: "string" },
    verbose: { type: "string", short: "v" },
    slow: { type: "boolean", short: "s" },
    algorithm: { type: "string", short: "a" },
    frontierDepth: { type: "string" },
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
      --wings                     Enable Void Wings
      --sword                     Enable Void Sword
      --endless                   Enable Endless Void Rod
  -v, --verbose <level>           Verbosity level: 1 = log search progress, 2 = replay solution
  -s, --slow                      Add 100ms delay per node during search
      --initialThreshold <n>      Override initial IDA* cost threshold
      --cheatFirstNSteps <n>      Skip first N steps using the known correct path
  -a, --algorithm <name>          Search algorithm: idaStar (default) | rbfs | aStar | aStarThenIdaStar
      --frontierDepth <n>         A* layers before IDA* tail in aStarThenIdaStar (default 10)

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
  board: rawLevel.board,
  entities: rawLevel.entities ?? emptyEntityGrid(),
  player: rawLevel.player,
};
const TARGET_BOARD: Board = rawBrand.board;

const initialThreshold =
  values.initialThreshold ? Number(values.initialThreshold) : undefined;

const pacifistBranes = ["Add", "Eus", "Mon", "Lev", "Cif"];
const holdTrueSword =
  values.sword && values.brane && pacifistBranes.includes(values.brane) ?
    false
  : values.sword;
const scenarioName = `${values.brane}/${values.brand}${values.wings ? " wings" : ""}${holdTrueSword ? " sword" : ""}${values.endless ? " endless" : ""}`;
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
  // Disable sword if we're in an enemy-less brane.
  if (values.sword && values.brane && pacifistBranes.includes(values.brane)) {
    console.log("Sword has no function in a brane with no enemies; disabling.");
    values.sword = false;
  }

  // Impossible setup.
  if (
    KNOWN_CORRECT_PATHS[scenarioName] === "IMPOSSIBLE" ||
    KNOWN_CORRECT_PATHS[`${values.brane}/${values.brand} universal`] ===
      "IMPOSSIBLE"
  ) {
    console.error(`Scenario marked as impossible.`);
    process.exit(1);
  }

  // Advance the initial state by applying the first N steps of the known
  // correct path, so the search can skip ahead past already-solved prefixes.
  const cheatN = values.cheatFirstNSteps ? Number(values.cheatFirstNSteps) : 0;
  let searchState = INITIAL_STATE;
  const cheatPrefix: Action[] = [];

  if (cheatN > 0) {
    if (!knownCorrectPath.length) {
      console.error(
        `--cheatFirstNSteps requires a known correct path for "${scenarioName}" but none is defined.`,
      );
      process.exit(1);
    }
    if (knownCorrectPath.length < cheatN) {
      console.error(
        `--cheatFirstNSteps ${cheatN} exceeds known path length ${knownCorrectPath.length}.`,
      );
      process.exit(1);
    }
    for (let i = 0; i < cheatN; i++) {
      const action = knownCorrectPath[i]!;
      const next = applyAction(searchState, action, {
        wings: values.wings ?? false,
        sword: values.sword ?? false,
        endless: values.endless ?? false,
      });
      if (!next) {
        console.error(
          `Cheat step ${i + 1} (${action}) produced an invalid state.`,
        );
        process.exit(1);
      }
      cheatPrefix.push(action);
      searchState = next;
    }
    console.log(
      `Cheated first ${cheatN} steps (${actionsToString(
        cheatPrefix,
      )}). Starting from:\n${renderState(searchState)}`,
    );
  }

  console.log(
    `Searching for solution with ${values.algorithm}... ${scenarioName}, known path is ${KNOWN_CORRECT_PATHS[scenarioName]}`,
  );

  const start = performance.now();
  const { path, nodesExplored } = await search({
    initial: searchState,
    target: TARGET_BOARD,
    verbose: Number(values.verbose),
    slow: values.slow ?? false,
    requireFinalJump: true,
    initialThreshold,
    knownCorrectPath: knownCorrectPath.slice(cheatN),
    burdens: {
      wings: values.wings ?? false,
      sword: values.sword ?? false,
      endless: values.endless ?? false,
    },
    algorithm: values.algorithm as
      | "idaStar"
      | "rbfs"
      | "aStar"
      | "aStarThenIdaStar",
    ...(values.frontierDepth !== undefined ?
      { frontierDepth: Number(values.frontierDepth) }
    : {}),
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

  const fullPath = [...cheatPrefix, ...path];

  if (values.verbose)
    replayPath(INITIAL_STATE, fullPath, TARGET_BOARD, {
      wings: values.wings ?? false,
      sword: values.sword ?? false,
      endless: values.endless ?? false,
    });

  console.log(`Solution found in ${fullPath.length} steps (${perf}):`);
  console.log(actionsToString(fullPath));
  if (fullPath.length < knownCorrectPath.length)
    console.log(
      `New path is better than previous known best of ${knownCorrectPath.length}!!`,
    );

  console.log(
    values.brane +
      "/" +
      values.brand +
      (values.wings ? " wings" : "") +
      (values.sword ? " sword" : "") +
      (values.endless ? " endless" : ""),
  );
}

main();
