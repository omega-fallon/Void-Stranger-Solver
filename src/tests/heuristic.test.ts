import assert from "assert";
import test from "node:test";
import { PARTIAL_EUS_STATES } from "../data/PARTIAL_EUS_STATES";
import { applyAction, renderBoard, renderState } from "../gameState";
import { heuristic } from "../heuristic";
import { BRANDS, BRANES, KNOWN_CORRECT_PATHS } from "../levels";
import { NO_BURDENS, type Action, type GameState } from "../types";
import {
  applyPath,
  emptyEntityGrid,
  parseBoard,
  parseEntities,
} from "../utils";

// Tests that h(after) ≤ h(before) + 1 for a single action (consistency).
// Each action costs 1, so a consistent heuristic must not increase by more than 1.
const CONSISTENCY_CASES: {
  name: string;
  initial: GameState;
  action: Action;
  target: string[];
  solutionLength?: number;
  requireFinalJump?: boolean;
}[] = [
  {
    name: "picking up glass",
    initial: {
      // prettier-ignore
      board: parseBoard([
        " ###GG",
        " #    ",
        " S    ",
        "      ",
        "      ",
        "      ",
      ]),
      entities: emptyEntityGrid(),
      player: { row: 0, col: 4, facing: "right", staffContent: [] },
    },
    solutionLength: 1,
    action: "staff",
    // prettier-ignore
    target: [
      " ###G ",
      " #    ",
      " S    ",
      "      ",
      "      ",
      "      ",
    ],
  },
  {
    name: "Mangled Eus step 6 -> 7",
    initial: {
      // prettier-ignore
      board: parseBoard([
        "GG  GG",
        "G ##GG",
        "GG#GGG",
        "GGGGGG",
        "GGG GG",
        "GGGSGG"
      ]),
      // prettier-ignore
      entities: parseEntities([
        "      ",
        "      ",
        "      ",
        "      ",
        "      ",
        "     R",
      ]),
      player: { row: 1, col: 4, facing: "right", staffContent: [] },
    },
    solutionLength: 1,
    action: "staff",
    // TODO: Make this consistent with using parseBoard above, I
    // prettier-ignore
    target: [
      "GG  GG",
      "G ##G ",
      "GG#GGG",
      "GGGGGG",
      "GGG GG",
      "GGGSGG"
    ],
  },
  {
    name: "Eus step 6 -> 7",
    initial: {
      // prettier-ignore
      board: parseBoard([
        "GG  GG",
        "G ##GG",
        "GG#GGG",
        "GGGGGG",
        "GGG GG",
        "GGGSGG"
      ]),
      // prettier-ignore
      entities: parseEntities([
        "      ",
        "      ",
        "      ",
        "      ",
        "      ",
        "     R",
      ]),
      player: { row: 1, col: 4, facing: "right", staffContent: [] },
    },
    solutionLength: 1,
    action: "staff",
    // TODO: Make this consistent with using parseBoard above, I
    // prettier-ignore
    target: [
      "GG  GG",
      "G ##G ",
      "GG#GGG",
      "GGGGGG",
      "GGG GG",
      "GGGSGW"
    ],
  },
  {
    name: "Eus/Eus search correctness regression",
    initial: {
      // prettier-ignore
      "board": parseBoard([
        "GG  GG",
        "  ##  ",
        "GG G G",
        "GGGGGG",
        "GGG GG",
        "GGGSGG"
      ]),
      // prettier-ignore
      entities: parseEntities([
        "      ",
        "      ",
        "      ",
        "      ",
        "      ",
        "     R",
      ]),
      player: {
        row: 2,
        col: 3,
        facing: "left",
        staffContent: ["floor"],
        wingsActive: false,
      },
    },
    action: "down",
    // prettier-ignore
    target: [
      "GG  GG",
      "  ##  ",
      "GG   G",
      "GGG GG",
      "GG #GG",
      "GG  GG"
    ],
    solutionLength: 7,
  },
  {
    name: "Broken",
    initial: {
      // prettier-ignore
      "board": parseBoard([
        "G GGGG",
        "  G# G",
        "G #GGG",
        "GG  GG",
        "G G# G",
        "GG SG#"
      ]),
      // prettier-ignore
      "entities": parseEntities([
        "      ",
        "      ",
        "      ",
        "      ",
        "      ",
        "     R"
      ]),
      player: {
        row: 1,
        col: 3,
        facing: "left",
        staffContent: [],
        wingsActive: false,
      },
    },
    action: "left",
    // prettier-ignore
    target: [
      "G GGGG",
      "  G# G",
      "G #GGG",
      "GG  GG",
      "G G# G",
      "GG SG#"
    ],
  },
];

for (const {
  name,
  initial: before,
  action,
  target,
  solutionLength,
  requireFinalJump = false,
} of CONSISTENCY_CASES) {
  if (solutionLength == null) continue;
  test(`Heuristic admissibility — ${name}`, () => {
    const after = applyAction(before, action, NO_BURDENS);
    assert.ok(after !== null, `Action "${action}" was unexpectedly invalid`);
    const targetBoard = parseBoard(target);
    const hBefore = heuristic(
      name.split("/")[0] ?? name,
      before,
      targetBoard,
      requireFinalJump,
      NO_BURDENS,
    );
    // console.log(`Heuristic admissibility — ${name}, hBefore: ${hBefore.total}`);
    assert.ok(
      hBefore.total <= solutionLength,
      `Heuristic is ${hBefore.total} — expected ≤ ${solutionLength}. mismatches: ${hBefore.mismatches}, transportCost: ${hBefore.transportCost}, travelCost: ${hBefore.travelCost}`,
    );
  });
}
// Actually we don't need the heuristic to be consistent — see https://webdocs.cs.ualberta.ca/~jonathan/publications/ai_publications/incaaai.pdf
// for (const {
//   name,
//   initial: before,
//   action,
//   target,
//   requireFinalJump = false,
// } of CONSISTENCY_CASES) {
//   test(`Heuristic consistency — ${name}`, () => {
//     const after = applyAction(before, action);
//     assert.ok(after !== null, `Action "${action}" was unexpectedly invalid`);
//     const targetBoard = parseBoard(target);
//     const hBefore = heuristic(before, targetBoard, requireFinalJump, burdens).total;
//     const hAfter = heuristic(after, targetBoard, requireFinalJump, burdens).total;
//     // console.log(
//     //   `Heuristic consistency — ${name}, hBefore: ${hBefore}, hAfter: ${hAfter}`,
//     // );
//     assert.ok(
//       hBefore <= hAfter + 1,
//       `Heuristic decreased by ${
//         hBefore - hAfter
//       } after "${action}" — expected ≤ 1. h(before)=${hBefore}, h(after)=${hAfter}\n${JSON.stringify(
//         {
//           h: heuristic(before, parseBoard(target), requireFinalJump, burdens, burdens),
//           nextH: heuristic(after, parseBoard(target), requireFinalJump),
//         },
//         null,
//         2,
//       )}\n${renderBoard(before)}\n${renderBoard(after)}`,
//     );
//   });
// }

test("Heuristic + steps should not exceed target level for all state pairs (admissibility)", () => {
  for (const [iStr, level] of Object.entries(PARTIAL_EUS_STATES)) {
    for (const [targetLevelNumberStr, targetLevel] of Object.entries(
      PARTIAL_EUS_STATES,
    )) {
      const i = Number(iStr);
      const targetLevelNumber = Number(targetLevelNumberStr);
      if (targetLevelNumber <= i) continue;
      const stepsTaken = Number(level.name.replace(/\D*/, ""));
      const state = {
        ...level,
        board: parseBoard(level.board),
        entities: emptyEntityGrid(),
      } as GameState;
      const target = parseBoard(targetLevel.board);
      const heuristicValues = heuristic(
        "Eus",
        state,
        target,
        level.requireFinalJump ?? false,
        NO_BURDENS,
      );
      const combined = stepsTaken + heuristicValues.total;

      if (combined > targetLevelNumber) {
        console.log(
          `Heuristic + steps should not exceed ${targetLevelNumber} in ${level.name}: Got ${combined} > ${targetLevelNumber}`,
        );
        const nextPlayerStates = PARTIAL_EUS_STATES.slice(
          i,
          targetLevelNumber + 1,
        ).map(
          (state) =>
            `${state.player.row},${state.player.col} facing ${state.player.facing}, staff: ${state.player.staffContent}`,
        );
        console.log("Next player states:\n", nextPlayerStates.join("\n"));
        console.log(
          renderState({
            ...level,
            board: parseBoard(level.board),
            entities: emptyEntityGrid(),
          } as GameState),
        );
      }

      assert.ok(
        combined <= targetLevelNumber,
        `Going from ${
          level.name
        } to ${targetLevelNumber}, step ${stepsTaken} + h ${
          heuristicValues.total
        } = total: ${combined} > ${targetLevelNumber}. mismatches: ${
          heuristicValues.mismatches
        }, transportCost: ${heuristicValues.transportCost}, travelCost: ${
          heuristicValues.travelCost
        }\n${JSON.stringify(
          heuristic("Eus", state, target, level.requireFinalJump ?? false, NO_BURDENS),
          null,
          2,
        )}\n${renderState(state)}`,
      );
    }
  }
});

for (const [searchName, pathStr] of Object.entries(KNOWN_CORRECT_PATHS)) {
  if (pathStr.includes("IMPOSSIBLE")) {
    continue;
  }

  const hasWings = searchName.includes(" wings");
  const hasSword = searchName.includes(" sword");
  const hasEndless = searchName.includes(" endless");
  const coreName = searchName
    .replace(" wings", "")
    .replace(" sword", "")
    .replace(" endless", "")
    .trim();
  const [braneName, brandName] = coreName.split("/");
  const brane = BRANES.find((b) => b.name === braneName);
  const brand = BRANDS.find((b) => b.name === brandName);
  if (!brane || !brand) continue;

  const burdens = { wings: hasWings, sword: hasSword, endless: hasEndless };

  test(`Heuristic admissibility along known path — ${searchName}`, () => {
    const statesOnPath = applyPath(brane, pathStr, burdens);
    for (const [iStr, state] of Object.entries(statesOnPath)) {
      const stepsTaken = Number(iStr);
      const stepsRemaining = pathStr.length - stepsTaken;
      const h = heuristic(braneName!, state, brand.board, true, burdens);
      const nextState = statesOnPath[Number(iStr) + 1];
      assert.ok(
        h.total <= stepsRemaining,
        `Step ${stepsTaken}/${pathStr.length}: h=${h.total} > ${stepsRemaining} steps remaining. ` +
          `mismatches: ${h.mismatches}, transportCost: ${h.transportCost}, travelCost: ${h.travelCost}\n${renderState(state)}\nTo:\n${nextState && renderState(nextState)}`,
      );
    }
  });

  test(`Heuristic backward admissibility along known path — ${searchName}`, async () => {
    const statesOnPath = applyPath(brane, pathStr, burdens);

    // Mirror of the forward test above: instead of fixing the target at the
    // final board and varying the starting step forward through the path,
    // this fixes the starting step and varies the target backward through the
    // path.  For each state at step i and each earlier board at step i < j,
    // h(state[i], board[j]) must be ≤ i − j (the number of steps needed to
    // go from from state[i] to a state with board[j]).
    //
    // This tests the A* heuristic used in bidirectional search.
    for (
      let startStepI = 0;
      startStepI < statesOnPath.length - 1;
      startStepI++
    ) {
      let valuesOnPath = [];
      for (
        let endStepI = startStepI;
        endStepI < statesOnPath.length;
        endStepI++
      ) {
        const target = statesOnPath[endStepI]!;
        const initial = statesOnPath[startStepI]!;
        const stepsBack = endStepI - startStepI;
        const h = heuristic(
          braneName!,
          initial,
          target.board,
          endStepI === statesOnPath.length - 1,
          burdens,
        );
        valuesOnPath.push(h.total);
        await test(`${searchName} step ${startStepI} → step ${endStepI}`, () => {
          assert.ok(
            h.total <= stepsBack,
            `${searchName} step ${startStepI} → step ${endStepI}: h=${h.total} > ${stepsBack} required steps. ` +
              `mismatches: ${h.mismatches}, transportCost: ${h.transportCost}, travelCost: ${h.travelCost}\n${renderState(initial)}\nTo:\n${renderState(target)}\nh-values as we move target state further away on path: ${valuesOnPath
                .map((el, i) => [el, pathStr[startStepI + i]])
                .flat()
                .slice(0, -1) // cut off the following movement letter which isn't relevant
                .join(
                  " → ",
                )}\nThis means that the heuristic is over-estimating how hard it is to get from this starting state to this ending state, because of one of those last steps jumping the heuristic up too high, but the heuristic may not do this from all starting/ending points that include this step.`,
          );
        });
      }
    }
  });
}
