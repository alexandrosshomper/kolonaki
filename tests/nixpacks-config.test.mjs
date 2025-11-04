import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// Fixture maintenance: if Coolify's nixpacks.toml template changes, adjust the
// assertions below (or expand the parser) to match the updated configuration
// before re-running the suite.
const tomlPath = new URL("../nixpacks.toml", import.meta.url);
const tomlText = await readFile(tomlPath, "utf8");

function parseToml(input) {
  const result = {};
  const pathStack = [];

  const lines = input.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    if (line.startsWith("[") && line.endsWith("]")) {
      const sectionPath = line.slice(1, -1).split(".");
      let current = result;

      for (const segment of sectionPath) {
        current[segment] ??= {};
        current = current[segment];
      }

      pathStack.splice(0, pathStack.length, ...sectionPath);
      continue;
    }

    const keyValueMatch = line.match(/^(?<key>[^=]+)=(?<value>.+)$/);
    if (!keyValueMatch) {
      continue;
    }

    const key = keyValueMatch.groups.key.trim();
    const value = keyValueMatch.groups.value.trim();

    const target = pathStack.reduce((obj, segment) => obj[segment], result);
    target[key] = parseTomlValue(value);
  }

  return result;
}

function parseTomlValue(value) {
  if (value.startsWith("[") && value.endsWith("]")) {
    const inner = value.slice(1, -1).trim();
    if (!inner) {
      return [];
    }

    return inner
      .split(",")
      .map((item) => item.trim())
      .map((item) => stripQuotes(item));
  }

  return stripQuotes(value);
}

function stripQuotes(value) {
  if (value.startsWith("\"") && value.endsWith("\"")) {
    return value.slice(1, -1);
  }
  return value;
}

const parsedToml = parseToml(tomlText);

test("nixpacks config sets node version and build commands", () => {
  assert.equal(parsedToml?.phases?.setup?.nodejs_version, "22");
  assert(parsedToml?.phases?.install?.cmds?.includes("npm ci"));
  assert(parsedToml?.phases?.build?.cmds?.includes("npm run build"));
});
