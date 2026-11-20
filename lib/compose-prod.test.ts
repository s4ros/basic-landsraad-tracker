import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

test("production compose takes the host from the environment and does not publish the database", () => {
  const path = new URL("../compose.prod.yaml", import.meta.url);
  assert.equal(existsSync(path), true);
  const source = readFileSync(path, "utf8");
  for (const required of [
    "postgres:17-alpine",
    "myresolver",
    "name: traefik",
    "PUBLIC_HOST",
    "landsraad-web:current",
  ]) {
    assert.equal(source.includes(required), true, required);
  }
  for (const forbidden of ["dune.s4ros.it", "landsraad:landsraad", "3000:3000"]) {
    assert.equal(source.includes(forbidden), false, forbidden);
  }
  assert.equal(/^build:/m.test(source), false);
});
