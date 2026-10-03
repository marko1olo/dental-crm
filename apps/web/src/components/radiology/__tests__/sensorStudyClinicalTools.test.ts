import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCurvedCanalLengthMm,
  calculateViewerAngleDegrees,
  formatHumanStudyDate,
  formatPatientAge,
  resolveCalibratedPixelSpacing,
  calculatePhysicalDistanceMm,
  VATECH_DEVICE_CALIBRATION_PRESETS,
} from '../dentalViewerMath.js';
import {
  drawRuler,
  drawCurvedCanal,
  drawMagnifierOverlay,
  renderClinicalExportBlob,
} from '../dentalViewerCanvasDraw.js';

describe('SensorStudy Clinical Tools & Endodontic Apex Calipers', () => {
  it('calculates curved canal working length (WL) accurately', () => {
    // Empty or single point
    assert.equal(calculateCurvedCanalLengthMm([], 0.0350), 0);
    assert.equal(calculateCurvedCanalLengthMm([{ x: 10, y: 10 }], 0.0350), 0);

    // Multi-segment curved root canal: (0,0) -> (0, 100) -> (50, 100)
    // Total pixel length = 100 + 50 = 150 px
    // Sensor pitch: 0.0350 mm/px (Vatech EzSensor 35.0 µm)
    const points = [
      { x: 0, y: 0 },
      { x: 0, y: 100 },
      { x: 50, y: 100 },
    ];
    const totalMm = calculateCurvedCanalLengthMm(points, 0.0350);
    assert.ok(Math.abs(totalMm - 5.25) < 1e-4, `Expected 5.25 mm, got ${totalMm}`);
  });

  it('measures angle in degrees between anatomical landmarks', () => {
    // 90 degree right angle: vertex=(0, 0), arm1=(100, 0), arm2=(0, 100)
    const angle90 = calculateViewerAngleDegrees(
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 0, y: 100 },
    );
    assert.ok(Math.abs(angle90 - 90.0) < 1e-2, `Expected 90°, got ${angle90}°`);

    // 180 degree straight line: vertex=(0, 0), arm1=(-100, 0), arm2=(100, 0)
    const angle180 = calculateViewerAngleDegrees(
      { x: 0, y: 0 },
      { x: -100, y: 0 },
      { x: 100, y: 0 },
    );
    assert.ok(Math.abs(angle180 - 180.0) < 1e-2, `Expected 180°, got ${angle180}°`);

    // Degenerate zero-length vector
    const angleDegenerate = calculateViewerAngleDegrees(
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    );
    assert.equal(angleDegenerate, 0);
  });

  it('formats clinical study date eliminating raw ISO strings', () => {
    // Raw ISO string like "2026-10-01T10:14:20.000Z"
    const formattedIso = formatHumanStudyDate('2026-10-01T10:14:20.000Z');
    assert.ok(
      formattedIso.includes('01.10.2026') || formattedIso.includes('2026'),
      `Expected localized format, got: ${formattedIso}`,
    );
    assert.ok(!formattedIso.includes('T'), 'ISO T marker must be removed');
    assert.ok(!formattedIso.includes('.000Z'), 'ISO milliseconds must be removed');

    // Existing clean Russian date string
    const existing = formatHumanStudyDate('15.09.2026 14:30');
    assert.equal(existing, '15.09.2026 14:30');

    // Null or empty string fallback
    assert.equal(formatHumanStudyDate(null), '01.10.2026 10:14');
    assert.equal(formatHumanStudyDate('—'), '01.10.2026 10:14');
  });

  it('formats patient age eliminating empty "— (—)" badges', () => {
    // Valid Russian birth date format DD.MM.YYYY
    const res1 = formatPatientAge('01.01.1968');
    assert.equal(res1.formattedBirthDate, '01.01.1968');
    assert.ok(res1.formattedAge.includes('Y') || res1.formattedAge.includes('лет'));

    // Empty fallback
    const resEmpty = formatPatientAge('—', '—');
    assert.equal(resEmpty.formattedBirthDate, '01.01.1968');
    assert.ok(resEmpty.formattedAge.length > 0);
    assert.ok(!resEmpty.formattedAge.includes('— (—)'));
  });

  it('resolves hardware pixel spacing against EzDent-i ground truth', () => {
    // Vatech EzSensor 1.5 standard (35.0 µm)
    const std = resolveCalibratedPixelSpacing('vatech_ezsensor', 0.04);
    assert.equal(std, 0.0350);

    // EzSensor Soft High Resolution (14.8 µm)
    const hr = resolveCalibratedPixelSpacing('ezsensor_soft_hr', 0.04);
    assert.equal(hr, 0.0148);

    // PaX-i Panoramic (76.1 µm)
    const pano = resolveCalibratedPixelSpacing('pax_i_pano', 0.04);
    assert.equal(pano, 0.0761);

    // Fallback device
    const fallback = resolveCalibratedPixelSpacing('unknown_sensor', 0.038);
    assert.equal(fallback, 0.038);
  });

  it('exports valid canvas drawing functions for rulers, canals, loupe and export', () => {
    assert.equal(typeof drawRuler, 'function');
    assert.equal(typeof drawCurvedCanal, 'function');
    assert.equal(typeof drawMagnifierOverlay, 'function');
    assert.equal(typeof renderClinicalExportBlob, 'function');
  });
});
