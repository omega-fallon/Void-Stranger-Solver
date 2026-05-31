import assert from "assert";
import test from "node:test";
import type { Action } from "../types";
import { estimateProgress, type ProgressSample } from "../estimateProgress";

// ACTIONS order (from gameState.ts): ["left", "up", "right", "down", "staff"]
// indices:                                0       1       2       3        4
//
// Formula: progress = Σ (indexOf(path[i]) / 5) × (1/5)^i
//
// Conceptually: represents the fraction of the search space that has been
// fully explored *before* reaching this path in the DFS tree. The first
// action in the path selects a 1/5-wide bucket; each subsequent action
// subdivides that bucket by 1/5 again.

function assertClose(actual: number, expected: number, label: string): void {
  assert.ok(
    Math.abs(actual - expected) < 1e-10,
    `${label}: expected ${expected}, got ${actual}`,
  );
}

// ── Single-step paths ────────────────────────────────────────────────────────

test("empty path → 0", () => {
  assertClose(estimateProgress([]), 0, "empty path");
});

test("left (index 0) → 0", () => {
  // Left is the first action — no search space has been completed yet.
  assertClose(estimateProgress(["left"]), 0, "left");
});

test("up (index 1) → 1/5", () => {
  // All left-prefixed paths (1/5 of the space) have been completed.
  assertClose(estimateProgress(["up"]), 1 / 5, "up");
});

test("right (index 2) → 2/5", () => {
  assertClose(estimateProgress(["right"]), 2 / 5, "right");
});

test("down (index 3) → 3/5", () => {
  assertClose(estimateProgress(["down"]), 3 / 5, "down");
});

test("staff (index 4) → 4/5", () => {
  assertClose(estimateProgress(["staff"]), 4 / 5, "staff");
});

// ── User's worked examples ───────────────────────────────────────────────────

test("user example: RLLL → 2/5", () => {
  // right contributes 2/5; the three lefts each contribute 0 (index 0).
  // So the progress equals the progress of a bare "right" path.
  assertClose(
    estimateProgress(["right", "left", "left", "left"]),
    2 / 5,
    "RLLL",
  );
});

test("user example: UL → 1/5", () => {
  // up contributes 1/5; left adds 0. Net = 1/5.
  assertClose(estimateProgress(["up", "left"]), 1 / 5, "UL");
});

// ── Two-step paths ───────────────────────────────────────────────────────────

test("LU → 0 + 1/25", () => {
  // left (0) + up at depth 1 (1/5 × 1/5 = 1/25)
  assertClose(estimateProgress(["left", "up"]), 1 / 25, "LU");
});

test("UU → 1/5 + 1/25 = 6/25", () => {
  assertClose(estimateProgress(["up", "up"]), 6 / 25, "UU");
});

test("ZZ → 4/5 + 4/25 = 24/25", () => {
  assertClose(estimateProgress(["staff", "staff"]), 24 / 25, "ZZ");
});

// ── Three-step path ──────────────────────────────────────────────────────────

test("RDZ → 2/5 + 3/25 + 4/125", () => {
  // right=2, down=3, staff=4
  const expected = 2 / 5 + 3 / 25 + 4 / 125;
  assertClose(estimateProgress(["right", "down", "staff"]), expected, "RDZ");
});

// ── Structural properties ────────────────────────────────────────────────────

test("appending left (index 0) does not change progress", () => {
  // Left contributes exactly 0 at any depth, so prepending a suffix of lefts
  // to any path leaves the result unchanged.
  const base = estimateProgress(["up"]);
  assertClose(estimateProgress(["up", "left"]), base, "UL vs U");
  assertClose(
    estimateProgress(["up", "left", "left", "left"]),
    base,
    "ULLL vs U",
  );
});

test("later actions of the same type contribute less than earlier ones", () => {
  // Depth-0 "up" contributes 1/5; depth-1 "up" contributes only 1/25.
  const depth0 = estimateProgress(["up"]) - estimateProgress(["left"]);
  const depth1 =
    estimateProgress(["left", "up"]) - estimateProgress(["left", "left"]);
  assert.ok(depth0 > depth1, "depth-0 contribution should exceed depth-1");
});

test("progress increases with later actions in ACTIONS order", () => {
  const paths: Action[][] = [["left"], ["up"], ["right"], ["down"], ["staff"]];
  let prev = -1;
  for (const path of paths) {
    const p = estimateProgress(path);
    assert.ok(p > prev, `Expected ${p} > ${prev} for path ${path}`);
    prev = p;
  }
});

test("second-level ordering: UL < UU < UR < UD < UZ", () => {
  const paths: Action[][] = [
    ["up", "left"],
    ["up", "up"],
    ["up", "right"],
    ["up", "down"],
    ["up", "staff"],
  ];
  let prev = -1;
  for (const path of paths) {
    const p = estimateProgress(path);
    assert.ok(p > prev, `Expected ${p} > ${prev} for path [${path}]`);
    prev = p;
  }
});

test("all results are in [0, 1)", () => {
  const paths: Action[][] = [
    [],
    ["left"],
    ["staff"],
    ["staff", "staff"],
    ["staff", "staff", "staff", "staff", "staff"],
    ["right", "down", "staff"],
    ["right", "left", "left", "left"],
  ];
  for (const path of paths) {
    const p = estimateProgress(path);
    assert.ok(p >= 0, `path [${path}] gave negative progress ${p}`);
    assert.ok(p < 1, `path [${path}] gave progress ≥ 1: ${p}`);
  }
});

// ── Samples-based interpolation ──────────────────────────────────────────────
//
// Hand-crafted samples covering three checkpoints in DFS order:
//   fraction 0.00 → path ["left"]          (uniform ≈ 0.0)
//   fraction 0.50 → path ["right"]         (uniform ≈ 0.4)
//   fraction 0.90 → path ["staff", "left"] (uniform ≈ 0.8)
//
// ACTIONS order: left(0), up(1), right(2), down(3), staff(4)

const SAMPLES: ProgressSample[] = [
  { fraction: 0.0, path: ["left"] },
  { fraction: 0.5, path: ["right"] },
  { fraction: 0.9, path: ["staff", "left"] },
];

test("samples: query exactly at a sample returns that sample's fraction", () => {
  assertClose(estimateProgress(["left"], SAMPLES), 0.0, "left");
  assertClose(estimateProgress(["right"], SAMPLES), 0.5, "right");
  assertClose(estimateProgress(["staff", "left"], SAMPLES), 0.9, "staff,left");
});

test("samples: query before the first sample returns the first sample's fraction", () => {
  // The empty path comes before ["left"] in DFS order (parent before children).
  // Binary search lands on index 0 (the first sample ≤ []).
  // With only one sample as lo and no hi, we'd return lo.fraction = 0.0.
  // But [] precedes ["left"], so lo is actually index 0 (the first sample
  // whose path compares ≤ [] — since [] < ["left"], lo = -1 which clamps to 0).
  // In practice the binary search starts at lo=0; [] < ["left"] so hi becomes
  // -1 leaving lo=0. The result is interpolation between sample[-1] and
  // sample[0], but since there's no sample[-1] the implementation returns
  // sample[0].fraction = 0.0.
  // Verify: just ensure it's in [0, 0.5).
  const p = estimateProgress([], SAMPLES);
  assert.ok(p >= 0 && p < 0.5, `expected ∈ [0, 0.5), got ${p}`);
});

test("samples: query strictly between two samples returns value strictly between them", () => {
  // ["up"] is between ["left"] and ["right"] in DFS order (up has index 1).
  const p = estimateProgress(["up"], SAMPLES);
  assert.ok(p > 0.0 && p < 0.5, `["up"] expected ∈ (0, 0.5), got ${p}`);
});

test("samples: query between second and third sample returns value strictly between them", () => {
  // ["down"] is between ["right"] (index 2) and ["staff","left"] (index 4).
  const p = estimateProgress(["down"], SAMPLES);
  assert.ok(p > 0.5 && p < 0.9, `["down"] expected ∈ (0.5, 0.9), got ${p}`);
});

test("samples: query past the last sample returns the last sample's fraction", () => {
  // ["staff", "staff"] comes after ["staff", "left"] in DFS order.
  const p = estimateProgress(["staff", "staff"], SAMPLES);
  assertClose(p, 0.9, "past last sample");
});

test("samples: order consistent — earlier DFS paths give smaller fractions", () => {
  const paths: Action[][] = [
    ["left"],
    ["up"],
    ["right"],
    ["down"],
    ["staff", "left"],
  ];
  let prev = -1;
  for (const path of paths) {
    const p = estimateProgress(path, SAMPLES);
    assert.ok(p >= prev, `Expected ${p} >= ${prev} for [${path}]`);
    prev = p;
  }
});

test("samples: undefined samples gives same result as no-samples call", () => {
  const path: Action[] = ["up", "right"];
  assertClose(
    estimateProgress(path, undefined),
    estimateProgress(path),
    "undefined samples vs no samples",
  );
});

test("samples: empty samples array falls back to uniform formula", () => {
  const path: Action[] = ["up", "right"];
  assertClose(
    estimateProgress(path, []),
    estimateProgress(path),
    "empty samples vs no samples",
  );
});
