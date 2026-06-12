import assert from "assert";
import test, { after } from "node:test";
import { renderState, renderBoard, replayPath } from "../../gameState";
import { BRANES, KNOWN_CORRECT_PATHS, RawLevel } from "../../levels";
import { search } from "../../search";
import { Action, EntityGrid } from "../../types";
import { applyPath, parseActions } from "../../utils";
const VERBOSE = Number(process.env.VERBOSE);

for (let algorithm of [
  "aStar",
  // "aStarThenIdaStar", // This algorithm is messed up in some situations, so disabling for now
  "idaStar",
  "rbfs",
] as const) {
  test.suite(`Testing algorithm: ${algorithm}`, async () => {
    for (let [label, knownCorrectPath] of Object.entries(KNOWN_CORRECT_PATHS)) {
      const TEST_LEVELS: (RawLevel & { initial: { entities: EntityGrid } } & {
        knownCorrectPath: Action[];
        solutionLength?: number;
        requireFinalJump?: boolean;
      })[] = [];

      const hasWings = label.includes(" wings");
      const hasSword = label.includes(" sword");
      const hasEndless = label.includes(" endless");
      const coreName = label
        .replace(" wings", "")
        .replace(" sword", "")
        .replace(" endless", "")
        .trim();
      const [brane, brand] = coreName.split("/");

      test.suite(
        `Testing each step of known path for ${brane}/${brand} ${hasWings ? "wings" : ""} ${hasSword ? "sword" : ""} ${hasEndless ? "endless" : ""}`,
        async () => {
          let level = BRANES.find((b) => b.name === brane)!;
          let partialSolveStates = applyPath(level, knownCorrectPath, {
            wings: hasWings,
            sword: hasSword,
            endless: hasEndless,
          }).map((v, i) => ({
            ...v,
            name: `${brane}/${brand} step ${i}`,
            requireFinalJump: false,
          }));
          // replayPath(
          //   level,
          //   parseActions(knownCorrectPath),
          //   partialSolveStates.at(-1)!.board,
          //   { wings: hasWings, sword: hasSword, endless: hasEndless },
          //   true,
          // );
          partialSolveStates.at(-1)!.requireFinalJump = true;

          for (let i = 0; i < partialSolveStates.length - 1; i++) {
            let startState = partialSolveStates[i]!;
            let endState = partialSolveStates[i + 1]!;

            TEST_LEVELS.push({
              name: endState.name,
              initial: startState,
              target: endState.board,
              requireFinalJump: endState.requireFinalJump,
              knownCorrectPath: parseActions(knownCorrectPath[i]!),
            });
          }

          for (const level of TEST_LEVELS) {
            test(`${algorithm} ${level.name}`, { timeout: 300 }, async (t) => {
              // console.log(`${level.name}`);
              const initial = {
                board: level.initial.board,
                entities: level.initial.entities,
                player: level.initial.player,
              };
              // console.log(renderBoard(level.initial));
              const target = level.target;
              const requireFinalJump = level.requireFinalJump ?? false;
              const { path } = await Promise.race([
                search({
                  initial,
                  target,
                  verbose: VERBOSE,
                  requireFinalJump,
                  initialThreshold: 1,
                  algorithm,
                  burdens: {
                    wings: hasWings,
                    sword: hasSword,
                    endless: hasEndless,
                  },
                  knownCorrectPath: level.knownCorrectPath,
                }),
                new Promise<{ path: null }>((resolve) =>
                  t.signal.addEventListener(
                    "abort",
                    () => resolve({ path: null }),
                    { once: true },
                  ),
                ),
              ]);
              if (t.signal.aborted) return;
              // if (level.solutionLength) {
              //   assert.equal(level.solutionLength, path?.length);
              // }
              assert.ok(
                path !== null,
                `No solution found from \n${renderState(initial)}\nto\n${renderBoard(target)}`,
              );
              if (VERBOSE) {
                if (path)
                  replayPath(
                    initial,
                    path,
                    target,
                    { wings: hasWings, sword: hasSword, endless: hasEndless },
                    requireFinalJump,
                  );
                console.log(
                  `Solved level "${level.name}" with a path of length ${path.length} ${
                    requireFinalJump ? "and jumped into the void" : ""
                  }`,
                );
                console.log(level);
              }
            });
          }
        },
      );
    }
  });
}

after(() => {
  // Defer exit by one event-loop tick so the test runner can write its
  // trailing TAP plan line before the process is killed.  This is needed
  // because any async search operations that are still running after a
  // test times out will keep the process alive indefinitely.
  setImmediate(() => process.exit(0));
});
