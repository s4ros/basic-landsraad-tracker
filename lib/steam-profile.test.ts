import assert from "node:assert/strict";
import test from "node:test";
import { cleanDisplayName, steamNameFromProfileXml } from "./steam-profile.ts";

test("steam profile xml yields the name inside steamID", () => {
  const xml = "<profile><steamID><![CDATA[Sietch Tabr]]></steamID></profile>";
  assert.equal(steamNameFromProfileXml(xml), "Sietch Tabr");
});

test("steam profile xml without a readable name yields null", () => {
  assert.equal(steamNameFromProfileXml("<profile></profile>"), null);
  assert.equal(steamNameFromProfileXml("<steamID><![CDATA[]]></steamID>"), null);
  assert.equal(steamNameFromProfileXml(`<steamID><![CDATA[${"A".repeat(81)}]]></steamID>`), null);
  assert.equal(steamNameFromProfileXml(`<steamID><![CDATA[${"A".repeat(80)}]]></steamID>`), "A".repeat(80));
});

test("cleanDisplayName trims, collapses spaces, and drops control characters", () => {
  assert.equal(cleanDisplayName("  A\t\nB  ", "Steam"), "A B");
  assert.equal(cleanDisplayName("A\u0000B\u007f", "Steam"), "AB");
});

test("cleanDisplayName uses a cleaned fallback, then Gracz", () => {
  assert.equal(cleanDisplayName("   ", "  Steam   "), "Steam");
  assert.equal(cleanDisplayName("\u0000", "\u0001"), "Gracz");
  assert.equal(cleanDisplayName("", ""), "Gracz");
});

test("cleanDisplayName keeps at most 80 characters", () => {
  assert.equal(cleanDisplayName("Ł".repeat(81), "Steam"), "Ł".repeat(80));
});
