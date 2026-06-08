import assert from "assert";
import { test } from "node:test";
import { isGoal } from "../gameState";
import { BRANDS, BRANES, KNOWN_CORRECT_PATHS } from "../levels";
import { applyPath } from "../utils";

for (const [searchName, pathStr] of Object.entries(KNOWN_CORRECT_PATHS)) {
  const hasWings = searchName.endsWith(" wings");
  const coreName = hasWings ? searchName.slice(0, -" wings".length) : searchName;
  const [braneName, brandName] = coreName.split("/");
  const brane = BRANES.find((b) => b.name === braneName);
  const brand = BRANDS.find((b) => b.name === brandName);
  if (!brane || !brand) continue;

  const burdens = { wings: hasWings, sword: false };

  test(`Known solution reaches target — ${searchName}`, () => {
    const states = applyPath(brane, pathStr, burdens);
    const finalState = states[states.length - 1]!;
    assert.ok(
      isGoal(finalState, brand.board, true),
      `Path "${pathStr}" did not reach the ${brandName} brand from the ${braneName} brane`,
    );
  });
}
