import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveMprClinicalPresetProjection } from "../mprClinicalStatus.js";

describe("resolveMprClinicalPresetProjection", () => {
  it("should return the requested projection if availableProjections is undefined", () => {
    assert.equal(
      resolveMprClinicalPresetProjection("sagittal", undefined),
      "sagittal"
    );
  });

  it("should return the requested projection if availableProjections is empty", () => {
    assert.equal(
      resolveMprClinicalPresetProjection("coronal", []),
      "coronal"
    );
  });

  it("should return the requested projection if it exists in availableProjections", () => {
    assert.equal(
      resolveMprClinicalPresetProjection("axial", ["sagittal", "coronal", "axial"]),
      "axial"
    );
  });

  it("should fall back to 'coronal' if 'panoramic_reconstruction' is requested and 'coronal' is available", () => {
    assert.equal(
      resolveMprClinicalPresetProjection("panoramic_reconstruction", ["sagittal", "axial", "coronal"]),
      "coronal"
    );
  });

  it("should fall back to 'axial' if the requested projection is not available and 'axial' is available", () => {
    assert.equal(
      resolveMprClinicalPresetProjection("sagittal", ["coronal", "axial"]),
      "axial"
    );
  });

  it("should fall back to the first available projection if neither exact, panoramic fallback, nor axial are available", () => {
    assert.equal(
      resolveMprClinicalPresetProjection("sagittal", ["oblique", "curved"]),
      "oblique"
    );
  });

  it("should fall back to 'axial' even for 'panoramic_reconstruction' if 'coronal' is not available but 'axial' is", () => {
    assert.equal(
      resolveMprClinicalPresetProjection("panoramic_reconstruction", ["sagittal", "axial", "oblique"]),
      "axial"
    );
  });
});
