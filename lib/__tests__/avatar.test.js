import assert from "node:assert/strict";
import { describe, it } from "node:test";

const { getInitials, getAvatarColor } = await import("../avatar.js");

describe("getInitials", () => {
  it("returns first letter of first and last name", () => {
    assert.equal(getInitials("Ada Lovelace"), "AL");
  });

  it("uses outermost tokens with multiple middle names", () => {
    assert.equal(getInitials("Ada Marie Lovelace"), "AL");
  });

  it("uses first two letters when only one token of length >= 2", () => {
    assert.equal(getInitials("Ada"), "AD");
  });

  it("returns single uppercase letter when only one character", () => {
    assert.equal(getInitials("A"), "A");
  });

  it("returns ? for empty string", () => {
    assert.equal(getInitials(""), "?");
  });

  it("returns ? for whitespace only", () => {
    assert.equal(getInitials("   "), "?");
  });

  it("returns ? for null and undefined", () => {
    assert.equal(getInitials(null), "?");
    assert.equal(getInitials(undefined), "?");
  });

  it("trims surrounding whitespace", () => {
    assert.equal(getInitials("  Ada Lovelace  "), "AL");
  });
});

describe("getAvatarColor", () => {
  it("returns the same color for the same seed", () => {
    const a = getAvatarColor("ada@example.com");
    const b = getAvatarColor("ada@example.com");
    assert.deepStrictEqual(a, b);
  });

  it("returns colors with non-empty bg and fg", () => {
    const { bg, fg } = getAvatarColor("alan@example.com");
    assert.match(bg, /^#[0-9A-F]{6}$/i);
    assert.match(fg, /^#[0-9A-F]{6}$/i);
  });

  it("returns different colors for different seeds (not always)", () => {
    const seeds = [
      "alpha",
      "bravo",
      "charlie",
      "delta",
      "echo",
      "foxtrot",
      "golf",
      "hotel",
    ];
    const distinct = new Set(seeds.map((s) => getAvatarColor(s).bg));
    assert.ok(
      distinct.size > 1,
      `expected variation in palette across seeds, got ${distinct.size}`
    );
  });

  it("handles empty seed", () => {
    const { bg, fg } = getAvatarColor("");
    assert.match(bg, /^#[0-9A-F]{6}$/i);
    assert.match(fg, /^#[0-9A-F]{6}$/i);
  });
});
