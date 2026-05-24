#!/usr/bin/env node

import { parseArgs } from "node:util";
import type { Board, Cell } from "./types";
import { LEVELS } from "./levels";
import { aStar } from "./search";

export function parseBoard(rows: string[]): Board {
  const charToCell: Record<string, Cell> = {
    " ": "empty",
    "#": "floor",
    G: "glass",
    S: "stairs",
    W: "wall",
  };
  return rows.map((row) =>
    Array.from(row).map((ch) => {
      const cell = charToCell[ch];
      if (cell === undefined)
        throw new Error(`Unknown tile character: "${ch}"`);
      return cell;
    })
  );
}
