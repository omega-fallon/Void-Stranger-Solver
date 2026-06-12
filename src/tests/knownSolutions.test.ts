import assert from "assert";
import { test } from "node:test";
import { isGoal, renderBoard, renderState } from "../gameState";
import { BRANDS, BRANES, KNOWN_CORRECT_PATHS } from "../levels";
import { applyPath } from "../utils";

for (const [searchName, pathStr] of Object.entries(KNOWN_CORRECT_PATHS)) {
  const hasWings = searchName.includes(" wings");
  const hasSword = searchName.includes(" sword");
  const hasEndless = searchName.includes(" endless");
  const coreName = searchName.replace(" wings","").replace(" sword","").replace(" endless","").trim();
  const [braneName, brandName] = coreName.split("/");
  const brane = BRANES.find((b) => b.name === braneName);
  const brand = BRANDS.find((b) => b.name === brandName);
  if (!brane || !brand) continue;

  const burdens = { wings: hasWings, sword: hasSword, endless: hasEndless };

  test(`Known solution reaches target — ${searchName}`, () => {
    const states = applyPath(brane, pathStr, burdens);
    const finalState = states[states.length - 1]!;
    assert.ok(
      isGoal(finalState, brand.board, true),
      `Path "${pathStr}" did not reach the ${brandName} brand from the ${braneName} brane.\nExpected:\n${renderBoard(brand.board)}\nActual:\n${renderState(finalState)}`,
    );
  });
}
