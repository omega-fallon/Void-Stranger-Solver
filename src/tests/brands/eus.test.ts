import assert from "assert";
import test from "node:test";
import { replayPath } from "../../gameState";
import { RawLevel } from "../../levels";
import { search } from "../../search";
import { emptyEntityGrid, parseBoard } from "../../utils";
import { PARTIAL_EUS_STATES } from "../../data/PARTIAL_EUS_STATES";
const VERBOSE = !!process.env.VERBOSE;

const TEST_LEVELS: (RawLevel & {
  solutionLength?: number;
  requireFinalJump?: boolean;
})[] = [];

let FOCUS_ONE_TEST = false;
let DEBUG_MAX_STEPS = 26; // 20 requires only 16 steps ignoring final player position, but 21 requires 21 steps

for (
  let i = FOCUS_ONE_TEST ? DEBUG_MAX_STEPS - 1 : 0;
  i < Math.min(DEBUG_MAX_STEPS, PARTIAL_EUS_STATES.length - 1);
  i++
) {
  let startState = PARTIAL_EUS_STATES[0]!;
  let endState = PARTIAL_EUS_STATES[i + 1]!;
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
    const { path } = await search(
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
      console.log(
        `Solved level "${level.name}" with a path of length ${path.length} ${
          requireFinalJump ? "and jumped into the void" : ""
        }`,
      );
      console.log(level);
    }
  });
}
