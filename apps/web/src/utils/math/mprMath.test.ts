import { describe, it } from 'node:test';
import assert from 'node:assert';
import { distanceMm } from './mprMath.js';
import type { DicomViewerToolStatePoint } from '@dental/shared';

describe('distanceMm', () => {
  it('should calculate the distance correctly when distance is 0', () => {
    const point1: DicomViewerToolStatePoint = {
      world: [1, 2, 3],
      canvas: null,
      plane: null,
      sourceIndex: 0
    };

    assert.strictEqual(distanceMm(point1, point1), 0);
  });

  it('should calculate the standard Euclidean distance between two points in 3D', () => {
    const point1: DicomViewerToolStatePoint = {
      world: [0, 0, 0],
      canvas: null,
      plane: null,
      sourceIndex: 0
    };

    const point2: DicomViewerToolStatePoint = {
      world: [3, 4, 12],
      canvas: null,
      plane: null,
      sourceIndex: 0
    };

    assert.strictEqual(distanceMm(point1, point2), 13);
  });

  it('should calculate the distance correctly with negative coordinates', () => {
    const point1: DicomViewerToolStatePoint = {
      world: [-1, -2, -3],
      canvas: null,
      plane: null,
      sourceIndex: 0
    };

    const point2: DicomViewerToolStatePoint = {
      world: [-4, -6, -15],
      canvas: null,
      plane: null,
      sourceIndex: 0
    };

    assert.strictEqual(distanceMm(point1, point2), 13);
  });

  it('should calculate the distance correctly with floating point coordinates', () => {
    const point1: DicomViewerToolStatePoint = {
      world: [1.5, 2.5, 3.5],
      canvas: null,
      plane: null,
      sourceIndex: 0
    };

    const point2: DicomViewerToolStatePoint = {
      world: [4.5, 6.5, 15.5],
      canvas: null,
      plane: null,
      sourceIndex: 0
    };

    assert.strictEqual(distanceMm(point1, point2), 13);
  });
});
