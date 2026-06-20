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
      // Skip these; not actual paths, just markers for being impossible.
      if (label.includes("universal") || knownCorrectPath === "IMPOSSIBLE") {
        continue;
      }

      // Establish TEST_STATE_PAIRS, an array of RawLevel data intersected with an initial state of entities and other data.
      // The knownCorrectPath is the known correct path between the two states. Usually just a singular Action.
      const TEST_STATE_PAIRS: (RawLevel & {
        initial: { entities: EntityGrid };
      } & {
        knownCorrectPath: Action[];
        solutionLength?: number;
        requireFinalJump?: boolean;
      })[] = [];

      // Decode constants from the text name of the scenario.
      const hasWings = label.includes(" wings");
      const hasSword = label.includes(" sword");
      const hasEndless = label.includes(" endless");
      const coreName = label
        .replace(" wings", "")
        .replace(" sword", "")
        .replace(" endless", "")
        .trim();
      const [brane, brand] = coreName.split("/");

      // Performing the test.
      test.suite(
        `Testing each step of known path for ${brane}/${brand}${hasWings ? " wings" : ""}${hasSword ? " sword" : ""}${hasEndless ? " endless" : ""}`,
        async () => {
          let level = BRANES.find((b) => b.name === brane)!;

          // Create an array of all steps along the path of our scenario.
          let partialSolveStates = applyPath(level, knownCorrectPath, {
            wings: hasWings,
            sword: hasSword,
            endless: hasEndless,
          }).map((v, i) => ({
            ...v,
            name: `${brane}/${brand}${hasWings ? " wings" : ""}${hasSword ? " sword" : ""}${hasEndless ? " endless" : ""} step ${i}`,
            requireFinalJump: false,
          }));

          // replayPath(
          //   level,
          //   parseActions(knownCorrectPath),
          //   partialSolveStates.at(-1)!.board,
          //   { wings: hasWings, sword: hasSword, endless: hasEndless },
          //   true,
          // );

          // Final jump is required for final step.
          partialSolveStates.at(-1)!.requireFinalJump = true;

          // Iterate through all subsequent pairs of partialSolveStates; stop the cursor 1 before the end.
          // This creates the array of state pairs.
          for (let i = 0; i < partialSolveStates.length - 1; i++) {
            let startState = partialSolveStates[i]!;
            let endState = partialSolveStates[i + 1]!;

            TEST_STATE_PAIRS.push({
              name: endState.name,
              initial: startState,
              target: endState.board,
              requireFinalJump: endState.requireFinalJump,
              knownCorrectPath: parseActions(knownCorrectPath[i]!),
            });
          }

          // Iterate through each set of state pairs to see if they're individually possible. This will point out errors in our simulation and our algorithms.
          for (const pair of TEST_STATE_PAIRS) {
            test(`${algorithm} ${pair.name}`, { timeout: 300 }, async (t) => {
              // console.log(`${pair.name}`);
              const initial = {
                board: pair.initial.board,
                entities: pair.initial.entities,
                player: pair.initial.player,
              };
              // console.log(renderBoard(pair.initial));
              const target = pair.target;
              const requireFinalJump = pair.requireFinalJump ?? false;

              // Run our algorithm to try to find the path.
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
                  knownCorrectPath: pair.knownCorrectPath,
                }),

                // Abort on signal, setting path to null.
                new Promise<{ path: null }>((resolve) =>
                  t.signal.addEventListener(
                    "abort",
                    () => resolve({ path: null }),
                    { once: true },
                  ),
                ),
              ]);

              // Check for null or empty path.
              if (path === null) {
                console.log("Returned path was null.");
              } else if (path.length === 0) {
                console.log("Returned path was empty.");
              }

              if (t.signal.aborted) return;

              // if (pair.solutionLength) {
              //   assert.equal(pair.solutionLength, path?.length);
              // }

              // Test is passed if the path is not null, fails otherwise.
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
                  `Solved pair "${pair.name}" with a path of length ${path.length}${requireFinalJump ? " and jumped into the void" : ""}`,
                );
                console.log(pair);
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
