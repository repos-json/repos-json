// The compiled schema, shared by the tests that check the samples against it and the tests that
// check the schema itself. One compilation, one place the ajv options live.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Ajv2020, type ValidateFunction } from "ajv/dist/2020.js";

export const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const readJson = (file: string): unknown => JSON.parse(readFileSync(file, "utf8"));

const isSchema = (value: unknown): value is object => typeof value === "object" && value !== null;

const schema = readJson(path.join(repositoryRoot, "schema", "repo.schema.json"));
assert.ok(isSchema(schema), "the schema must be an object");

export const validateRepoJson: ValidateFunction = new Ajv2020({ strict: true, allErrors: true }).compile(schema);
