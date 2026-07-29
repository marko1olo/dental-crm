import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { clampMprSlabMm, classifyBoneDensity } from "./mprMath.js";

describe("classifyBoneDensity", () => {
  it("should classify values >= 850 as D1", () => {
    assert.equal(classifyBoneDensity(850), "D1");
    assert.equal(classifyBoneDensity(1000), "D1");
    assert.equal(classifyBoneDensity(2000), "D1");
  });

  it("should classify values >= 500 and < 850 as D2", () => {
    assert.equal(classifyBoneDensity(500), "D2");
    assert.equal(classifyBoneDensity(700), "D2");
    assert.equal(classifyBoneDensity(849), "D2");
  });

  it("should classify values >= 225 and < 500 as D3", () => {
    assert.equal(classifyBoneDensity(225), "D3");
    assert.equal(classifyBoneDensity(300), "D3");
    assert.equal(classifyBoneDensity(499), "D3");
  });

  it("should classify values < 225 as D4", () => {
    assert.equal(classifyBoneDensity(224), "D4");
    assert.equal(classifyBoneDensity(0), "D4");
    assert.equal(classifyBoneDensity(-500), "D4");
    assert.equal(classifyBoneDensity(-1000), "D4");
  });
});

describe("clampMprSlabMm", () => {
  it("should return the value correctly rounded if within bounds [1, 30]", () => {
    assert.equal(clampMprSlabMm(15), 15);
    assert.equal(clampMprSlabMm(15.1), 15);
    assert.equal(clampMprSlabMm(15.5), 16);
    assert.equal(clampMprSlabMm(1), 1);
    assert.equal(clampMprSlabMm(30), 30);
  });

  it("should clamp values below the minimum bound (1)", () => {
    assert.equal(clampMprSlabMm(0), 1);
    assert.equal(clampMprSlabMm(-10), 1);
    assert.equal(clampMprSlabMm(0.4), 1);
  });

  it("should clamp values above the maximum bound (30)", () => {
    assert.equal(clampMprSlabMm(31), 30);
    assert.equal(clampMprSlabMm(100), 30);
    assert.equal(clampMprSlabMm(30.5), 30);
  });

  it("should handle non-finite values by returning the fallback value (1)", () => {
    assert.equal(clampMprSlabMm(NaN), 1);
    assert.equal(clampMprSlabMm(Infinity), 1);
    assert.equal(clampMprSlabMm(-Infinity), 1);
  });
});
