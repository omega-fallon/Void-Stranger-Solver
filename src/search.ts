import { frontierAStar } from "./searchAlgorithms/frontierAStar";
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
 *   "rbfs"         — Recursive Best-First Search
 *   "frontierAStar" — standard best-first A* with open/closed lists
 */
export async function search(options: SearchOptions): Promise<SearchResult> {
  const algorithm = options.algorithm ?? "idaStar";
  if (algorithm === "rbfs") return rbfs(options);
  if (algorithm === "frontierAStar") return frontierAStar(options);
  return idaStar(options);
}
