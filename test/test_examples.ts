import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Ajv2020 } from "ajv/dist/2020.js";
import { parseRepoJson } from "../src/parse.js";

// Every sample is checked against BOTH artifacts a reader might follow — the schema and the
// reference implementation — so a sample that contradicts either one fails the build rather than
// teaching someone the wrong thing.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const isSchema = (value: unknown): value is object => typeof value === "object" && value !== null;

const readJson = (file: string): unknown => JSON.parse(readFileSync(file, "utf8"));

const schema = readJson(path.join(root, "schema", "repo.schema.json"));
assert.ok(isSchema(schema), "the schema must be an object");

const validate = new Ajv2020({ strict: true, allErrors: true }).compile(schema);

const samples = [
  ...readdirSync(path.join(root, "examples"))
    .filter((name) => name.endsWith(".json"))
    .map((name) => path.join("examples", name)),
  "repo.json",
];

test("there are samples to check", () => {
  assert.ok(samples.length > 1, samples.join(", "));
});

samples.forEach((sample) => {
  test(`${sample} validates against the schema`, () => {
    const document = readJson(path.join(root, sample));
    assert.equal(validate(document), true, JSON.stringify(validate.errors));
  });

  // Spec section 10.3: a consumer reports what it dropped. A published sample must give it nothing
  // to report — anything else means the sample is teaching a mistake.
  test(`${sample} parses with nothing dropped`, () => {
    const meta = parseRepoJson(readJson(path.join(root, sample)));
    assert.deepEqual(meta.dropped, []);
  });
});
