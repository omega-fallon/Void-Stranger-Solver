import { parseArgs } from "util";
import { LEVELS } from "./levels";
import { applyPath, boardToStrings, entitiesToStrings } from "./utils";

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    brand: { type: "string", short: "b" },
  },
});

// This is used to generate the partial solution states of a known solution path for the sake of creating tests

const level = LEVELS.find((l) => l.name === values.brand);
if (!level) {
  console.log(`Could not find level with name: ${values.brand}`);
  process.exit();
}
if (!level.knownPath) {
  console.log(`Level doesn't have a known path saved: ${values.brand}`);
  process.exit();
}
const states = applyPath(level!.initial, level!.knownPath!);
console.log(
  JSON.stringify(
    states.map((state) => ({
      ...state,
      board: boardToStrings(state.board),
      entities: entitiesToStrings(state.entities),
    })),
    null,
    2,
  ),
);
