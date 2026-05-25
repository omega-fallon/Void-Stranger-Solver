import assert from "assert";
import test from "node:test";
import { PARTIAL_EUS_STATES } from "./data/PARTIAL_EUS_STATES";
import { heuristic } from "./heuristic";
import { parseBoard } from "./solve";
import { GameState } from "./types";

for (const [iStr, level] of Object.entries(PARTIAL_EUS_STATES)) {
  for (const [targetLevelNumberStr, targetLevel] of Object.entries(
    PARTIAL_EUS_STATES,
  )) {
    const i = Number(iStr);
    const targetLevelNumber = Number(targetLevelNumberStr);
    if (targetLevelNumber <= i) continue;
    test(`Heuristic + steps should not exceed ${targetLevelNumber} starting from ${level.name} -> ${targetLevelNumber}`, () => {
      const stepsTaken = Number(level.name.replace(/\D*/, ""));
      const heuristicValue = heuristic(
        { ...level, board: parseBoard(level.board) } as GameState,
        parseBoard(targetLevel.board),
      );
      const combined = stepsTaken + heuristicValue;

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
      }

      assert.ok(
        combined <= targetLevelNumber,
        `Going from ${level.name} to ${targetLevelNumber}, step ${stepsTaken} + h ${heuristicValue} = total: ${combined} > ${targetLevelNumber}`,
      );
    });
  }
}
