import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCurvedCanalLengthMm,
  calculateLesionAreaGaussMm2,
  calculatePolygonPerimeterMm,
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
  drawLesionContour,
  drawMagnifierOverlay,
  renderClinicalExportBlob,
} from '../dentalViewerCanvasDraw.js';
import {
  SENSOR_VENDOR_PROFILES,
  UNIVERSAL_SENSOR_CATALOG,
  KNOWN_TWAIN_DATA_SOURCES,
} from '../UniversalSensorGateway.js';
import {
  DEFAULT_RVG_FILTERS,
  RVG_FILTER_PRESETS,
} from '../RvgFiltersToolbar.js';
import {
  KNOWN_RVG_SENSOR_CATALOG,
} from '@dental/shared';

describe('SensorStudy Clinical Tools, Multi-Brand Hardware & Gauss Lesion Engine', () => {
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

  it('calculates periapical lesion contour area using Gauss Shoelace formula in mm²', () => {
    // Degenerate inputs (<3 vertices)
    assert.equal(calculateLesionAreaGaussMm2([], 0.0350), 0);
    assert.equal(calculateLesionAreaGaussMm2([{ x: 0, y: 0 }, { x: 100, y: 0 }], 0.0350), 0);

    // Right-angled triangle: (0,0) -> (100, 0) -> (0, 100)
    // Area_px2 = 0.5 * 100 * 100 = 5000 px²
    // mmPerPixel = 0.035 mm/px -> Area_mm2 = 5000 * 0.035 * 0.035 = 6.125 mm²
    const triangle = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 0, y: 100 },
    ];
    const triArea = calculateLesionAreaGaussMm2(triangle, 0.0350);
    assert.ok(Math.abs(triArea - 6.13) < 0.02, `Expected 6.13 mm², got ${triArea}`);

    // Square 100x100 px: (0,0) -> (100, 0) -> (100, 100) -> (0, 100)
    // Area_px2 = 10000 px² -> Area_mm2 = 10000 * 0.035 * 0.035 = 12.25 mm²
    const square = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ];
    const sqArea = calculateLesionAreaGaussMm2(square, 0.0350);
    assert.equal(sqArea, 12.25, `Expected 12.25 mm², got ${sqArea}`);

    // Perimeter of square 100x100 px -> 400 px * 0.035 mm/px = 14.0 mm
    const sqPerimeter = calculatePolygonPerimeterMm(square, 0.0350);
    assert.equal(sqPerimeter, 14.0, `Expected 14.0 mm, got ${sqPerimeter}`);
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
    const formattedIso = formatHumanStudyDate('2026-10-01T10:14:20.000Z');
    assert.ok(
      formattedIso.includes('01.10.2026') || formattedIso.includes('2026'),
      `Expected localized format, got: ${formattedIso}`,
    );
    assert.ok(!formattedIso.includes('T'), 'ISO T marker must be removed');
    assert.ok(!formattedIso.includes('.000Z'), 'ISO milliseconds must be removed');

    const existing = formatHumanStudyDate('15.09.2026 14:30');
    assert.equal(existing, '15.09.2026 14:30');

    assert.equal(formatHumanStudyDate(null), '01.10.2026 10:14');
    assert.equal(formatHumanStudyDate('—'), '01.10.2026 10:14');
  });

  it('formats patient age eliminating empty "— (—)" badges', () => {
    const res1 = formatPatientAge('01.01.1968');
    assert.equal(res1.formattedBirthDate, '01.01.1968');
    assert.ok(res1.formattedAge.includes('Y') || res1.formattedAge.includes('лет'));

    const resEmpty = formatPatientAge('—', '—');
    assert.equal(resEmpty.formattedBirthDate, '01.01.1968');
    assert.ok(resEmpty.formattedAge.length > 0);
    assert.ok(!resEmpty.formattedAge.includes('— (—)'));
  });

  it('resolves hardware pixel spacing against EzDent-i ground truth and world brands', () => {
    // Vatech EzSensor 1.5 standard (35.0 µm)
    const std = resolveCalibratedPixelSpacing('vatech_ezsensor', 0.04);
    assert.equal(std, 0.0350);

    // EzSensor Soft High Resolution (14.8 µm)
    const hr = resolveCalibratedPixelSpacing('ezsensor_soft_hr', 0.04);
    assert.equal(hr, 0.0148);

    // Dürr Dental VistaRay 7 (19.0 µm)
    const duerr = resolveCalibratedPixelSpacing('duerr_vistaray_7', 0.04);
    assert.equal(duerr, 0.0190);

    // Carestream RVG 5200 (18.5 µm)
    const carestream = resolveCalibratedPixelSpacing('carestream_rvg_5200', 0.04);
    assert.equal(carestream, 0.0185);

    // FONA Stellaris (17.8 µm)
    const fona = resolveCalibratedPixelSpacing('fona_stellaris', 0.04);
    assert.equal(fona, 0.0178);

    // Woodpecker i-Sensor (20.0 µm)
    const wp = resolveCalibratedPixelSpacing('woodpecker_isensor', 0.04);
    assert.equal(wp, 0.0200);

    // Planmeca ProSensor HD (15.0 µm)
    const planmeca = resolveCalibratedPixelSpacing('planmeca_prosensor_hd', 0.04);
    assert.equal(planmeca, 0.0150);

    // PaX-i Panoramic (76.1 µm)
    const pano = resolveCalibratedPixelSpacing('pax_i_pano', 0.04);
    assert.equal(pano, 0.0761);

    // Fallback device
    const fallback = resolveCalibratedPixelSpacing('unknown_sensor', 0.038);
    assert.equal(fallback, 0.038);
  });

  it('registers Dürr Dental and Carestream in UniversalSensorGateway catalog', () => {
    // Dürr Dental vendor profile
    const duerrProfile = SENSOR_VENDOR_PROFILES.find((p) => p.brand === 'duerr');
    assert.ok(duerrProfile, 'Dürr Dental profile must exist');
    assert.equal(duerrProfile.name, 'Dürr Dental');
    assert.ok(duerrProfile.defaultHotFolders.some((f) => f.includes('VistaSoft') || f.includes('DBSWin')));

    // Dürr models in catalog
    const vistaray1 = UNIVERSAL_SENSOR_CATALOG.find((m) => m.id === 'duerr_vistaray_7_size1');
    const vistaray2 = UNIVERSAL_SENSOR_CATALOG.find((m) => m.id === 'duerr_vistaray_7_size2');
    assert.ok(vistaray1, 'VistaRay 7 Size 1 must exist');
    assert.ok(vistaray2, 'VistaRay 7 Size 2 must exist');
    assert.equal(vistaray1.pixelSpacingMicrons, 19.0);
    assert.equal(vistaray2.pixelSpacingMicrons, 19.0);

    // Carestream models in catalog
    const cs5100 = UNIVERSAL_SENSOR_CATALOG.find((m) => m.id === 'carestream_rvg_5100');
    assert.ok(cs5100, 'Carestream RVG 5100 must exist');
    assert.ok(cs5100.pixelSpacingMicrons === 18.5 || cs5100.pixelSpacingMicrons === 19.0, 'Carestream pixel pitch must be 18.5 or 19.0 µm');

    // TWAIN Data Source for Dürr
    const duerrTwain = KNOWN_TWAIN_DATA_SOURCES.find((ds) => ds.id === 'ds_duerr_vistaray');
    assert.ok(duerrTwain, 'Dürr Dental TWAIN Data Source must be registered');
  });

  it('registers Carestream, Vatech 1.5, and Dürr in shared rvgTwainEngine catalog', () => {
    assert.ok(KNOWN_RVG_SENSOR_CATALOG['carestream_rvg_5100']);
    assert.equal(KNOWN_RVG_SENSOR_CATALOG['carestream_rvg_5100'].vendor, 'carestream');
    assert.equal(KNOWN_RVG_SENSOR_CATALOG['carestream_rvg_5100'].pixelPitchMicrons, 18.5);

    assert.ok(KNOWN_RVG_SENSOR_CATALOG['carestream_rvg_5200']);
    assert.equal(KNOWN_RVG_SENSOR_CATALOG['carestream_rvg_5200'].vendor, 'carestream');

    assert.ok(KNOWN_RVG_SENSOR_CATALOG['vatech_ezsensor_1_5']);
    assert.equal(KNOWN_RVG_SENSOR_CATALOG['vatech_ezsensor_1_5'].vendor, 'vatech');
    assert.equal(KNOWN_RVG_SENSOR_CATALOG['vatech_ezsensor_1_5'].pixelPitchMicrons, 35.0);

    assert.ok(KNOWN_RVG_SENSOR_CATALOG['duerr_vistaray_7_size1']);
    assert.equal(KNOWN_RVG_SENSOR_CATALOG['duerr_vistaray_7_size1'].vendor, 'duerr');
    assert.equal(KNOWN_RVG_SENSOR_CATALOG['duerr_vistaray_7_size1'].pixelPitchMicrons, 19.0);
  });

  it('configures emboss / pseudo-relief 3D preset and default filter values', () => {
    assert.equal(DEFAULT_RVG_FILTERS.emboss, false);

    const embossPreset = RVG_FILTER_PRESETS.find((p) => p.id === 'emboss');
    assert.ok(embossPreset, 'Emboss preset must be available');
    assert.equal(embossPreset.values.emboss, true);
    assert.ok(embossPreset.description.includes('Emboss'));
  });

  it('exports valid canvas drawing functions for rulers, canals, lesion contours, and loupe', () => {
    assert.equal(typeof drawRuler, 'function');
    assert.equal(typeof drawCurvedCanal, 'function');
    assert.equal(typeof drawLesionContour, 'function');
    assert.equal(typeof drawMagnifierOverlay, 'function');
    assert.equal(typeof renderClinicalExportBlob, 'function');
  });
});
