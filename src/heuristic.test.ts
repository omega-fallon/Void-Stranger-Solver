import assert from "assert";
import test from "node:test";
import { PARTIAL_EUS_STATES } from "./data/PARTIAL_EUS_STATES";
import { applyAction, renderBoard } from "./gameState";
import { heuristic } from "./heuristic";
import type { Action, GameState } from "./types";
import { emptyEntityGrid, parseBoard } from "./utils";

// Tests that h(after) ≤ h(before) + 1 for a single action (consistency).
// Each action costs 1, so a consistent heuristic must not increase by more than 1.
const CONSISTENCY_CASES: {
  name: string;
  before: GameState;
  action: Action;
  target: string[];
  solutionLength?: number;
  requireFinalJump?: boolean;
}[] = [
  {
    name: "picking up glass",
    before: {
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
    before: {
      // prettier-ignore
      board: parseBoard([
        "GG  GG",
        "G ##GG",
        "GG#GGG",
        "GGGGGG",
        "GGG GG",
        "GGGSGW"
      ]),
      entities: emptyEntityGrid(),
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
    name: "Eus step 6 -> 7",
    before: {
      // prettier-ignore
      board: parseBoard([
        "GG  GG",
        "G ##GG",
        "GG#GGG",
        "GGGGGG",
        "GGG GG",
        "GGGSGW"
      ]),
      entities: emptyEntityGrid(),
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
];

for (const {
  name,
  before,
  action,
  target,
  solutionLength,
  requireFinalJump = false,
} of CONSISTENCY_CASES) {
  if (solutionLength == null) continue;
  test(`Heuristic admissibility — ${name}`, () => {
    const after = applyAction(before, action);
    assert.ok(after !== null, `Action "${action}" was unexpectedly invalid`);
    const targetBoard = parseBoard(target);
    const hBefore = heuristic(before, targetBoard, requireFinalJump);
    console.log(`Heuristic admissibility — ${name}, hBefore: ${hBefore.total}`);
    assert.ok(
      hBefore.total <= solutionLength,
      `Heuristic is ${hBefore.total} — expected ≤ ${solutionLength}. mismatches: ${hBefore.mismatches}, transportCost: ${hBefore.transportCost}, travelCost: ${hBefore.travelCost}`,
    );
  });
}
for (const {
  name,
  before,
  action,
  target,
  requireFinalJump = false,
} of CONSISTENCY_CASES) {
  test(`Heuristic consistency — ${name}`, () => {
    const after = applyAction(before, action);
    assert.ok(after !== null, `Action "${action}" was unexpectedly invalid`);
    const targetBoard = parseBoard(target);
    const hBefore = heuristic(before, targetBoard, requireFinalJump).total;
    const hAfter = heuristic(after, targetBoard, requireFinalJump).total;
    console.log(
      `Heuristic consistency — ${name}, hBefore: ${hBefore}, hAfter: ${hAfter}`,
    );
    assert.ok(
      hAfter <= hBefore + 1,
      `Heuristic increased by ${
        hAfter - hBefore
      } after "${action}" — expected ≤ 1. h(before)=${hBefore}, h(after)=${hAfter}`,
    );
  });
}

test("Heuristic + steps should not exceed target level for all state pairs (admissibility)", () => {
  for (const [iStr, level] of Object.entries(PARTIAL_EUS_STATES)) {
    for (const [targetLevelNumberStr, targetLevel] of Object.entries(
      PARTIAL_EUS_STATES,
    )) {
      const i = Number(iStr);
      const targetLevelNumber = Number(targetLevelNumberStr);
      if (targetLevelNumber <= i) continue;
      const stepsTaken = Number(level.name.replace(/\D*/, ""));
      const heuristicValues = heuristic(
        {
          ...level,
          board: parseBoard(level.board),
          entities: emptyEntityGrid(),
        } as GameState,
        parseBoard(targetLevel.board),
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
          renderBoard({
            ...level,
            board: parseBoard(level.board),
            entities: emptyEntityGrid(),
          } as GameState),
        );
      }

      assert.ok(
        combined <= targetLevelNumber,
        `Going from ${level.name} to ${targetLevelNumber}, step ${stepsTaken} + h ${heuristicValues.total} = total: ${combined} > ${targetLevelNumber}. mismatches: ${heuristicValues.mismatches}, transportCost: ${heuristicValues.transportCost}, travelCost: ${heuristicValues.travelCost}`,
      );
    }
  }
});
