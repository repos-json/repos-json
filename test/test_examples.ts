import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import path from "node:path";
import { parseRepoJson } from "../src/parse.js";
import { readJson, repositoryRoot, validateRepoJson } from "./schemaValidator.js";

// Every sample is checked against BOTH artifacts a reader might follow — the schema and the
// reference implementation — so a sample that contradicts either one fails the build rather than
// teaching someone the wrong thing.
const samples = [
  ...readdirSync(path.join(repositoryRoot, "examples"))
    .filter((name) => name.endsWith(".json"))
    .map((name) => path.join("examples", name)),
  "repo.json",
];

test("there are samples to check", () => {
  assert.ok(samples.length > 1, samples.join(", "));
});

samples.forEach((sample) => {
  test(`${sample} validates against the schema`, () => {
    const document = readJson(path.join(repositoryRoot, sample));
    assert.equal(validateRepoJson(document), true, JSON.stringify(validateRepoJson.errors));
  });

  // Spec section 11.3: a consumer reports what it dropped. A published sample must give it nothing
  // to report — anything else means the sample is teaching a mistake.
  test(`${sample} parses with nothing dropped`, () => {
    const meta = parseRepoJson(readJson(path.join(repositoryRoot, sample)));
    assert.deepEqual(meta.dropped, []);
  });
});
