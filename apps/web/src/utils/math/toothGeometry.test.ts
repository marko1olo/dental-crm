import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getToothGroup } from "./toothGeometry.js";
describe("getToothGroup", () => {
  it("should return 'incisor' for tooth positions 1 and 2", () => {
    assert.equal(getToothGroup(11), "incisor");
    assert.equal(getToothGroup(22), "incisor");
    assert.equal(getToothGroup(51), "incisor");
    assert.equal(getToothGroup(82), "incisor");
  });
  it("should return 'canine' for tooth position 3", () => {
    assert.equal(getToothGroup(13), "canine");
    assert.equal(getToothGroup(43), "canine");
    assert.equal(getToothGroup(53), "canine");
  });
  it("should return 'premolar' for tooth positions 4 and 5 in permanent quadrants (1-4)", () => {
    assert.equal(getToothGroup(14), "premolar");
    assert.equal(getToothGroup(25), "premolar");
    assert.equal(getToothGroup(34), "premolar");
    assert.equal(getToothGroup(45), "premolar");
  });
  it("should return 'molar' for tooth positions 4 and 5 in deciduous quadrants (5-8)", () => {
    assert.equal(getToothGroup(54), "molar");
    assert.equal(getToothGroup(65), "molar");
    assert.equal(getToothGroup(74), "molar");
    assert.equal(getToothGroup(85), "molar");
  });
  it("should return 'wisdom' for tooth position 8", () => {
    assert.equal(getToothGroup(18), "wisdom");
    assert.equal(getToothGroup(28), "wisdom");
    assert.equal(getToothGroup(38), "wisdom");
    assert.equal(getToothGroup(48), "wisdom");
  });
  it("should return 'molar' for tooth positions 6 and 7 (and fallback)", () => {
    assert.equal(getToothGroup(16), "molar");
    assert.equal(getToothGroup(27), "molar");
    assert.equal(getToothGroup(46), "molar");
    assert.equal(getToothGroup(37), "molar");
  });
});
