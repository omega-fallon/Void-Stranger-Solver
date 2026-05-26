import assert from "assert";
import test from "node:test";
import { replayPath } from "../../gameState";
import { RawLevel } from "../../levels";
import { search } from "../../search";
import { emptyEntityGrid, parseBoard } from "../../utils";
import { PARTIAL_MON_STATES } from "../../data/PARTIAL_MON_STATES";
const VERBOSE = Number(process.env.VERBOSE);

const TEST_LEVELS: (RawLevel & {
  solutionLength?: number;
  requireFinalJump?: boolean;
})[] = [];

let FOCUS_ONE_TEST = false;
let DEBUG_MAX_STEPS = 100; // solving to step 32 takes about 10 minutes
let DEBUG_MIN_STEPS = 41; // we solved up to here already

for (
  let i = FOCUS_ONE_TEST ? DEBUG_MAX_STEPS - 1 : DEBUG_MIN_STEPS;
  i < Math.min(DEBUG_MAX_STEPS, PARTIAL_MON_STATES.length - 1);
  i++
) {
  let startState = PARTIAL_MON_STATES[0]!;
  let endState = PARTIAL_MON_STATES[i + 1]!;
  TEST_LEVELS.push({
    name: endState.name,
    initial: startState,
    target: endState.board,
    requireFinalJump: endState.requireFinalJump,
  } as RawLevel);
}

for (const level of TEST_LEVELS) {
  test(`${level.name}`, async () => {
    const initial = {
      board: parseBoard(level.initial.board),
      entities: emptyEntityGrid(),
      player: level.initial.player,
    };
    const target = parseBoard(level.target);
    const requireFinalJump = level.requireFinalJump ?? false;
    const { path, elapsedMs } = await search(
      initial,
      target,
      VERBOSE,
      false,
      requireFinalJump,
      Number(level.name.replace(/\D*/, "")),
    );
    if (level.solutionLength) {
      assert.equal(level.solutionLength, path?.length);
    }
    assert.ok(path !== null, "No solution found");
    if (VERBOSE) {
      if (path) replayPath(initial, path, target, requireFinalJump);
    }
    console.log(
      `Solved level "${level.name}" with a path of length ${path.length}${
        requireFinalJump ? " and jumped into the void" : ""
      } in ${(elapsedMs / 1000).toFixed(0)}sec`,
    );
  });
}
