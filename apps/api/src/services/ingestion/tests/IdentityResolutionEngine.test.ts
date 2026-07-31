import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { IdentityResolutionEngine } from "../IdentityResolutionEngine.js";

describe("IdentityResolutionEngine - levenshteinDistance", () => {
  it("should return 0 for identical strings", () => {
    assert.equal(IdentityResolutionEngine.levenshteinDistance("hello", "hello"), 0);
    assert.equal(IdentityResolutionEngine.levenshteinDistance("Иванов Иван", "Иванов Иван"), 0);
  });

  it("should return 0 for two empty strings", () => {
    assert.equal(IdentityResolutionEngine.levenshteinDistance("", ""), 0);
  });

  it("should return length of the other string if one is empty", () => {
    assert.equal(IdentityResolutionEngine.levenshteinDistance("", "hello"), 5);
    assert.equal(IdentityResolutionEngine.levenshteinDistance("hello", ""), 5);
    assert.equal(IdentityResolutionEngine.levenshteinDistance("", "Иванов"), 6);
    assert.equal(IdentityResolutionEngine.levenshteinDistance("Иванов", ""), 6);
  });

  it("should calculate correct distance for substitutions", () => {
    assert.equal(IdentityResolutionEngine.levenshteinDistance("hello", "hallo"), 1);
    assert.equal(IdentityResolutionEngine.levenshteinDistance("Иванов", "Иванова"), 1);
    assert.equal(IdentityResolutionEngine.levenshteinDistance("kitten", "sitten"), 1); // 1 substitution
    assert.equal(IdentityResolutionEngine.levenshteinDistance("sitten", "sittin"), 1); // 1 substitution
    assert.equal(IdentityResolutionEngine.levenshteinDistance("kitten", "sittin"), 2); // 2 substitutions
  });

  it("should calculate correct distance for additions/insertions", () => {
    assert.equal(IdentityResolutionEngine.levenshteinDistance("hello", "helloo"), 1);
    assert.equal(IdentityResolutionEngine.levenshteinDistance("sittin", "sitting"), 1);
    assert.equal(IdentityResolutionEngine.levenshteinDistance("kitten", "sitting"), 3); // 2 subs, 1 addition
  });

  it("should calculate correct distance for deletions", () => {
    assert.equal(IdentityResolutionEngine.levenshteinDistance("hello", "hell"), 1);
    assert.equal(IdentityResolutionEngine.levenshteinDistance("Иванов", "Ивано"), 1);
  });

  it("should be case sensitive", () => {
    assert.equal(IdentityResolutionEngine.levenshteinDistance("Hello", "hello"), 1);
    assert.equal(IdentityResolutionEngine.levenshteinDistance("Иванов", "иванов"), 1);
  });

  it("should calculate correct distance for completely different strings", () => {
    assert.equal(IdentityResolutionEngine.levenshteinDistance("abc", "xyz"), 3);
    assert.equal(IdentityResolutionEngine.levenshteinDistance("flitten", "dog"), 7);
  });
});
