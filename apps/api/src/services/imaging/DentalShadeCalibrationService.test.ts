import assert from "node:assert";
import { describe, test } from "node:test";
import { DentalShadeCalibrationService, CalibrationMetadata } from "./DentalShadeCalibrationService.js";

describe("DentalShadeCalibrationService", () => {
  const service = new DentalShadeCalibrationService();

  test("validateCalibrationPhoto returns true for valid metadata", () => {
    const meta: CalibrationMetadata = {
      hasReferenceScale: true,
      hasCrossPolarization: true,
      lightingCondition: 'D65'
    };
    assert.strictEqual(service.validateCalibrationPhoto(meta), true);
  });

  test("validateCalibrationPhoto returns false if reference scale is missing", () => {
    const meta: CalibrationMetadata = {
      hasReferenceScale: false,
      hasCrossPolarization: true,
      lightingCondition: 'D65'
    };
    assert.strictEqual(service.validateCalibrationPhoto(meta), false);
  });

  test("calibrate handles valid VITA Classical shade", () => {
    assert.strictEqual(service.calibrate('A1', 'VITA_CLASSICAL'), 'A1');
  });

  test("calibrate throws for invalid VITA Classical shade", () => {
    assert.throws(() => service.calibrate('Z9', 'VITA_CLASSICAL'));
  });

  test("calibrate handles valid VITA 3D-Master shade", () => {
    assert.strictEqual(service.calibrate('2M2', 'VITA_3D_MASTER'), '2M2');
  });

  test("calibrate throws for invalid VITA 3D-Master shade", () => {
    assert.throws(() => service.calibrate('9M9', 'VITA_3D_MASTER'));
  });
});
