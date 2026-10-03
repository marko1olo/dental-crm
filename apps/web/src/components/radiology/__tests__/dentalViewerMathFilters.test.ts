import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateWindowLevelContrast,
  clipChamferedSensorCorner,
  apply5x5SpatialConvolution,
  LAPLACIAN_KERNEL_5X5,
  SOBEL_45_KERNEL_3X3,
  GLSL_2D_RADIOLOGY_VERTEX_SHADER,
  GLSL_2D_RADIOLOGY_FRAGMENT_SHADER,
} from '../dentalViewerMath.js';

describe('Vatech EzDent-i 2D Filters & Shaders Math Invariants', () => {
  it('verifies LAPLACIAN_KERNEL_5X5 structure and energy conservation', () => {
    assert.equal(LAPLACIAN_KERNEL_5X5.length, 25);
    const center = LAPLACIAN_KERNEL_5X5[12];
    assert.equal(center, 16);
    const sum = LAPLACIAN_KERNEL_5X5.reduce((acc, val) => acc + val, 0);
    assert.equal(sum, 0); // High-pass filter sums to 0 for DC conservation
  });

  it('verifies SOBEL_45_KERNEL_3X3 diagonal Emboss matrix', () => {
    assert.equal(SOBEL_45_KERNEL_3X3.length, 9);
    // Matrix:
    // [-2, -1,  0]
    // [-1,  0,  1]
    // [ 0,  1,  2]
    assert.equal(SOBEL_45_KERNEL_3X3[0], -2);
    assert.equal(SOBEL_45_KERNEL_3X3[4], 0);
    assert.equal(SOBEL_45_KERNEL_3X3[8], 2);
    const sum = SOBEL_45_KERNEL_3X3.reduce((acc, val) => acc + val, 0);
    assert.equal(sum, 0);
  });

  it('verifies calculateWindowLevelContrast neutral point and limits', () => {
    const neutral = calculateWindowLevelContrast(0, 0);
    assert.ok(Math.abs(neutral.contrastFactor - 1.0) < 1e-3);
    assert.equal(neutral.brightnessOffset, 0);

    const highContrast = calculateWindowLevelContrast(20, 50);
    assert.ok(highContrast.contrastFactor > 1.0);
    assert.equal(highContrast.brightnessOffset, 0.2);

    const lowContrast = calculateWindowLevelContrast(-50, -50);
    assert.ok(lowContrast.contrastFactor < 1.0);
    assert.equal(lowContrast.brightnessOffset, -0.5);
  });

  it('verifies clipChamferedSensorCorner 65px cut on image buffer', () => {
    const width = 100;
    const height = 100;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 200;
      data[i + 1] = 200;
      data[i + 2] = 200;
      data[i + 3] = 255;
    }

    clipChamferedSensorCorner(data, width, height, 65, 'bottom_left');

    // Bottom-left corner pixel (x=0, y=99): height - 1 - y = 0, x = 0 -> cut!
    const blIdx = (99 * width + 0) * 4;
    assert.equal(data[blIdx], 0);
    assert.equal(data[blIdx + 1], 0);
    assert.equal(data[blIdx + 2], 0);

    // Center pixel (x=50, y=50): height - 1 - y = 49, x = 50 -> sum = 99 >= 65 -> not cut!
    const centerIdx = (50 * width + 50) * 4;
    assert.equal(data[centerIdx], 200);
    assert.equal(data[centerIdx + 1], 200);
    assert.equal(data[centerIdx + 2], 200);
  });

  it('verifies apply5x5SpatialConvolution correctly processes a test image without NaN', () => {
    const width = 8;
    const height = 8;
    const rgba = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < rgba.length; i += 4) {
      rgba[i] = 128;     // R
      rgba[i + 1] = 128; // G
      rgba[i + 2] = 128; // B
      rgba[i + 3] = 255; // A
    }

    const output = apply5x5SpatialConvolution(rgba, width, height, LAPLACIAN_KERNEL_5X5, 128);
    assert.equal(output.length, rgba.length);
    for (let i = 0; i < output.length; i += 4) {
      assert.ok(!Number.isNaN(output[i]));
      assert.ok(!Number.isNaN(output[i + 1]));
      assert.ok(!Number.isNaN(output[i + 2]));
      assert.equal(output[i + 3], 255);
    }
  });

  it('exports valid WebGL2 GLSL shaders with all required uniform bindings', () => {
    assert.ok(GLSL_2D_RADIOLOGY_VERTEX_SHADER.includes('#version 300 es'));
    assert.ok(GLSL_2D_RADIOLOGY_VERTEX_SHADER.includes('a_position'));
    assert.ok(GLSL_2D_RADIOLOGY_VERTEX_SHADER.includes('a_texCoord'));

    assert.ok(GLSL_2D_RADIOLOGY_FRAGMENT_SHADER.includes('#version 300 es'));
    assert.ok(GLSL_2D_RADIOLOGY_FRAGMENT_SHADER.includes('uniform int u_sharpen;'));
    assert.ok(GLSL_2D_RADIOLOGY_FRAGMENT_SHADER.includes('uniform int u_maxSharpen;'));
    assert.ok(GLSL_2D_RADIOLOGY_FRAGMENT_SHADER.includes('uniform int u_pseudoRelief;'));
    assert.ok(GLSL_2D_RADIOLOGY_FRAGMENT_SHADER.includes('uniform int u_invert;'));
    assert.ok(GLSL_2D_RADIOLOGY_FRAGMENT_SHADER.includes('uniform int u_cutChamfer;'));
    assert.ok(GLSL_2D_RADIOLOGY_FRAGMENT_SHADER.includes('0.00785398')); // PI / 400
  });
});
