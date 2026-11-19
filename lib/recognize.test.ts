import assert from "node:assert/strict";
import test from "node:test";
import {
  dhashFromGray,
  hamming,
  levenshtein,
  normalizeHouseText,
  proposeCell,
  type CellObservation,
  type CrestTemplate,
} from "./recognize.ts";

const houses = [
  { id: 1, name: "Imota" },
  { id: 2, name: "Ecaz" },
];

function cell(text: string, crestHash: bigint | null): CellObservation {
  return { row: 2, column: 4, text, crestHash };
}

test("normalizeHouseText keeps letters and digits", () => {
  assert.equal(normalizeHouseText(" Imota! "), "imota");
  assert.equal(normalizeHouseText("CLAIMED"), "claimed");
});

test("levenshtein counts edits against the whole name", () => {
  assert.equal(levenshtein("imota", "imota"), 0);
  assert.equal(levenshtein("imota", "1mota"), 1);
  assert.ok(levenshtein("imota", "alexin") > 2);
});

test("dhashFromGray accepts only a 9 by 8 image", () => {
  assert.throws(() => dhashFromGray(8, 8, new Uint8Array(64)), Error);
  assert.throws(() => dhashFromGray(9, 7, new Uint8Array(63)), Error);
});

test("dhashFromGray sets a bit when the left pixel is greater than the next", () => {
  const increasing = new Uint8Array(9 * 8);
  const decreasing = new Uint8Array(9 * 8);
  const oneBit = new Uint8Array(9 * 8);
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 9; x++) {
      increasing[y * 9 + x] = x;
      decreasing[y * 9 + x] = 8 - x;
      oneBit[y * 9 + x] = y === 0 && x === 0 ? 2 : x;
    }
  }

  assert.equal(dhashFromGray(9, 8, increasing), 0n);
  assert.equal(dhashFromGray(9, 8, decreasing), (1n << 64n) - 1n);
  assert.equal(dhashFromGray(9, 8, oneBit), 1n << 63n);
});

test("hamming counts bits that differ", () => {
  assert.equal(hamming(0n, 0n), 0);
  assert.equal(hamming(1n, 0n), 1);
  assert.equal(hamming((1n << 64n) - 1n, 0n), 64);
});

test("claimed text stays empty even when the crest matches", () => {
  const result = proposeCell(cell("CLAIMED", 0n), houses, [{ houseId: 1, crestHash: 0n }]);
  assert.deepEqual(result, { row: 2, column: 4, houseId: null, reason: "claimed" });
});

test("a readable name matches within two edits", () => {
  assert.deepEqual(proposeCell(cell("Imota", null), houses, []), {
    row: 2,
    column: 4,
    houseId: 1,
    reason: "name",
  });
  assert.deepEqual(proposeCell(cell("1mota", null), houses, []), {
    row: 2,
    column: 4,
    houseId: 1,
    reason: "name",
  });
});

test("an unreadable name without a crest stays empty", () => {
  assert.deepEqual(proposeCell(cell("xyz", null), houses, []), {
    row: 2,
    column: 4,
    houseId: null,
    reason: "empty",
  });
});

test("a crest match needs distance at most 10 and a margin of 4", () => {
  const observed = 7n;
  const imota = 0n;
  const ecazFar = ((1n << 12n) - 1n) ^ observed;
  const ecazNear = ((1n << 6n) - 1n) ^ observed;
  const templates = (ecaz: bigint): CrestTemplate[] => [
    { houseId: 1, crestHash: imota },
    { houseId: 2, crestHash: ecaz },
  ];

  assert.equal(hamming(observed, imota), 3);
  assert.equal(hamming(observed, ecazFar), 12);
  assert.equal(hamming(observed, ecazNear), 6);

  assert.deepEqual(proposeCell(cell("", observed), houses, templates(ecazFar)), {
    row: 2,
    column: 4,
    houseId: 1,
    reason: "crest",
  });
  assert.deepEqual(proposeCell(cell("", observed), houses, templates(ecazNear)), {
    row: 2,
    column: 4,
    houseId: null,
    reason: "empty",
  });
  assert.deepEqual(proposeCell(cell("", (1n << 11n) - 1n), houses, [{ houseId: 1, crestHash: 0n }]), {
    row: 2,
    column: 4,
    houseId: null,
    reason: "empty",
  });
  assert.equal(hamming((1n << 11n) - 1n, 0n), 11);
});

test("the closest template of a house is the one that counts", () => {
  const observed = 7n;
  const farImota = (1n << 20n) - 1n;
  const ecaz = ((1n << 12n) - 1n) ^ observed;
  assert.equal(hamming(observed, farImota), 17);
  assert.equal(hamming(observed, 0n), 3);
  assert.equal(hamming(observed, ecaz), 12);

  const result = proposeCell(cell("", observed), houses, [
    { houseId: 1, crestHash: farImota },
    { houseId: 1, crestHash: 0n },
    { houseId: 2, crestHash: ecaz },
  ]);
  assert.deepEqual(result, { row: 2, column: 4, houseId: 1, reason: "crest" });
});

test("a tied crest distance stays empty", () => {
  const observed = 7n;
  const ecaz = observed ^ (7n << 3n);
  assert.equal(hamming(observed, 0n), 3);
  assert.equal(hamming(observed, ecaz), 3);

  const result = proposeCell(cell("", observed), houses, [
    { houseId: 1, crestHash: 0n },
    { houseId: 2, crestHash: ecaz },
  ]);
  assert.deepEqual(result, { row: 2, column: 4, houseId: null, reason: "empty" });
});

test("a name and a crest for different houses conflict", () => {
  const result = proposeCell(cell("Ekaz", 0n), houses, [{ houseId: 1, crestHash: 0n }]);
  assert.deepEqual(result, { row: 2, column: 4, houseId: null, reason: "conflict" });
});

test("a name and a crest for the same house are a crest match", () => {
  const result = proposeCell(cell("Ekaz", 5n), houses, [{ houseId: 2, crestHash: 5n }]);
  assert.deepEqual(result, { row: 2, column: 4, houseId: 2, reason: "crest" });
});

test("a tied name distance does not pick a house", () => {
  const result = proposeCell(cell("Imoxa", null), [
    { id: 1, name: "Imota" },
    { id: 3, name: "Imoba" },
  ], []);
  assert.deepEqual(result, { row: 2, column: 4, houseId: null, reason: "empty" });
});
