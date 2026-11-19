import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { houseMarkFile, houseMarkPath } from "./house-marks.ts";

const houses = [
  "Imota",
  "Moritani",
  "Thorvald",
  "Alexin",
  "Wydras",
  "Kenola",
  "Ecaz",
  "Wallach",
  "Sor",
  "Dyvetz",
  "Maros",
  "Argosaz",
  "Novebruns",
  "Spinnette",
  "Wayku",
  "Taligari",
  "Lindaren",
  "Vernius",
  "Tseida",
  "Varota",
  "Mikarrol",
  "Hagal",
  "Hurata",
  "Mutelli",
  "Richese",
];

function assetName(name: string) {
  const slug = name === "Spinnette" ? "spinette" : name.toLowerCase();
  return `t_ui_iconslandsraadfactionhouse${slug}_d.webp`;
}

test("Imota resolves to the crest the owner placed", () => {
  assert.equal(houseMarkPath("Imota"), `/houses/${assetName("Imota")}`);
});

test("an unknown house has no mark", () => {
  assert.equal(houseMarkPath("NieMa"), null);
});

test("each catalog house has one file and the directory has nothing else", () => {
  const directory = path.join(process.cwd(), "public/houses");
  const files = readdirSync(directory);
  assert.equal(files.length, houses.length);
  const expected = new Set(houses.map(assetName));
  for (const file of files) assert.equal(expected.has(file), true, file);
  for (const name of houses) {
    const url = houseMarkPath(name);
    assert.equal(url, `/houses/${assetName(name)}`);
    assert.equal(existsSync(path.join(process.cwd(), "public", url ?? "")), true);
  }
});

test("two files for one house do not pick a mark", () => {
  assert.equal(houseMarkFile("Imota", ["imota.svg", "imota.png"]), null);
  assert.equal(houseMarkFile("Imota", ["imota.svg", assetName("Imota")]), null);
  assert.equal(houseMarkFile("Spinnette", [assetName("Spinnette")]), `/houses/${assetName("Spinnette")}`);
});
