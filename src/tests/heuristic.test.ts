import assert from "assert";
import test from "node:test";
import { PARTIAL_EUS_STATES } from "../data/PARTIAL_EUS_STATES";
import { applyAction, renderState } from "../gameState";
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
      player: { row: 0, col: 4, facing: "right", staffContent: "empty" },
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
      player: { row: 1, col: 4, facing: "right", staffContent: "empty" },
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
      player: { row: 1, col: 4, facing: "right", staffContent: "empty" },
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
        staffContent: "floor",
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
        staffContent: "empty",
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
    const hBefore = heuristic(before, targetBoard, requireFinalJump);
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
//     const hBefore = heuristic(before, targetBoard, requireFinalJump).total;
//     const hAfter = heuristic(after, targetBoard, requireFinalJump).total;
//     // console.log(
//     //   `Heuristic consistency — ${name}, hBefore: ${hBefore}, hAfter: ${hAfter}`,
//     // );
//     assert.ok(
//       hBefore <= hAfter + 1,
//       `Heuristic decreased by ${
//         hBefore - hAfter
//       } after "${action}" — expected ≤ 1. h(before)=${hBefore}, h(after)=${hAfter}\n${JSON.stringify(
//         {
//           h: heuristic(before, parseBoard(target), requireFinalJump),
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
        state,
        target,
        level.requireFinalJump ?? false,
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
          heuristic(state, target, level.requireFinalJump ?? false),
          null,
          2,
        )}\n${renderState(state)}`,
      );
    }
  }
});

for (let searchName of ["Add/Add", "Eus/Eus"]) {
  const [braneName, brandName] = searchName.split("/");
  let startState = BRANES.find((b) => b.name === braneName)!;
  let pathStr = KNOWN_CORRECT_PATHS[searchName]!;
  let statesOnPath = applyPath(startState, pathStr);
  for (const [iStr, state] of Object.entries(statesOnPath)) {
    let i = Number(iStr);
    let h = heuristic(
      state,
      BRANDS.find((b) => b.name === brandName)!.board,
      true,
    );
    console.log(
      `${searchName} at step ${i} with h=${h.total} which underestimates by ${
        pathStr.length - (i + h.total)
      } (${JSON.stringify(h)})`,
    );
  }
}
