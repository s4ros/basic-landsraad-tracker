import assert from "node:assert/strict";
import test from "node:test";
import { cycleStatus, isTileStatus } from "./tiles.ts";

test("cycle goes gray, gold, green, gray", () => {
  assert.equal(cycleStatus("idle"), "ready");
  assert.equal(cycleStatus("ready"), "collected");
  assert.equal(cycleStatus("collected"), "idle");
});

test("only the three stored statuses are tile statuses", () => {
  assert.equal(isTileStatus("idle"), true);
  assert.equal(isTileStatus("ready"), true);
  assert.equal(isTileStatus("collected"), true);
  assert.equal(isTileStatus("gold"), false);
  assert.equal(isTileStatus("claimed"), false);
});
