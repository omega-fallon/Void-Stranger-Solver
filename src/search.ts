import { aStar } from "./searchAlgorithms/aStar";
import { aStarThenIdaStar } from "./searchAlgorithms/aStarThenIdaStar";
import { idaStar } from "./searchAlgorithms/idaStar";
import { rbfs } from "./searchAlgorithms/rbfs";
import type { SearchOptions, SearchResult } from "./searchAlgorithms/shared";

// Re-export shared types and utilities so existing callers don't need to
// change their import paths.
export {
  allWatchersTriggeredQuestion,
  countFloorTiles,
  staffBanned,
  type SearchOptions,
  type SearchResult,
} from "./searchAlgorithms/shared";

/**
 * Dispatches to the requested search algorithm.
 *
 * Defaults to IDA* (`algorithm: "idaStar"`).
 *   "rbfs"             — Recursive Best-First Search
 *   "aStar"            — Standard A* with open/closed lists
 *   "aStarThenIdaStar" — A* for first `frontierDepth` layers, IDA* for the tail
 */
export async function search(options: SearchOptions): Promise<SearchResult> {
  const algorithm = options.algorithm ?? "idaStar";
  if (algorithm === "rbfs") return rbfs(options);
  if (algorithm === "aStar") return aStar(options);
  if (algorithm === "aStarThenIdaStar") return aStarThenIdaStar(options);
  if (algorithm === "idaStar") return idaStar(options);
  throw Error("Unknown algorithm choice");
}
