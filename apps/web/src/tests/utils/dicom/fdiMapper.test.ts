import test from 'node:test';
import assert from 'node:assert';
import { mapCtCoordinatesToFdiNumber, Point3D } from '../../../utils/dicom/fdiMapper.js';

test('mapCtCoordinatesToFdiNumber', async (t) => {
  await t.test('returns 11 (fallback) when spline points are less than 2', () => {
    const implantPos: Point3D = { x: 0, y: 0, z: 0 };
    const splinePoints: Point3D[] = [{ x: 1, y: 1, z: 1 }];
    const result = mapCtCoordinatesToFdiNumber(implantPos, splinePoints);
    assert.strictEqual(result, 11);
  });

  const splinePoints: Point3D[] = [
    { x: 0, y: 0, z: 10 }, // start
    { x: 10, y: 0, z: 10 }, // mid
    { x: 20, y: 0, z: 10 }, // end
  ];

  await t.test('Quadrant 1 (Maxilla, Right) - ratio <= 0.5, z > midPoint.z', () => {
    // Implant on right side (x=5), above spline (z=20)
    // ratio will be ~0.25 <= 0.5. isMaxilla will be true
    const implantPos: Point3D = { x: 5, y: 0, z: 20 };
    const result = mapCtCoordinatesToFdiNumber(implantPos, splinePoints);

    // rightTeeth = [8, 7, 6, 5, 4, 3, 2, 1]
    // normalizedRatio = 0.25 / 0.5 = 0.5
    // index = Math.floor(0.5 * 8) = 4 -> rightTeeth[4] = 4
    // Quadrant 1, Tooth 4 -> 14
    assert.strictEqual(result, 14);
  });

  await t.test('Quadrant 4 (Mandible, Right) - ratio <= 0.5, z <= midPoint.z', () => {
    // Implant on right side (x=5), below spline (z=5)
    // ratio ~0.25. isMaxilla false
    const implantPos: Point3D = { x: 5, y: 0, z: 5 };
    const result = mapCtCoordinatesToFdiNumber(implantPos, splinePoints);
    // Quadrant 4, Tooth 4 -> 44
    assert.strictEqual(result, 44);
  });

  await t.test('Quadrant 2 (Maxilla, Left) - ratio > 0.5, z > midPoint.z', () => {
    // Implant on left side (x=15), above spline (z=20)
    // ratio ~0.75 > 0.5. isMaxilla true
    const implantPos: Point3D = { x: 15, y: 0, z: 20 };
    const result = mapCtCoordinatesToFdiNumber(implantPos, splinePoints);

    // leftTeeth = [1, 2, 3, 4, 5, 6, 7, 8]
    // normalizedRatio = (0.75 - 0.5) / 0.5 = 0.5
    // index = Math.floor(0.5 * 8) = 4 -> leftTeeth[4] = 5
    // Quadrant 2, Tooth 5 -> 25
    assert.strictEqual(result, 25);
  });

  await t.test('Quadrant 3 (Mandible, Left) - ratio > 0.5, z <= midPoint.z', () => {
    // Implant on left side (x=15), below spline (z=5)
    // ratio ~0.75. isMaxilla false
    const implantPos: Point3D = { x: 15, y: 0, z: 5 };
    const result = mapCtCoordinatesToFdiNumber(implantPos, splinePoints);
    // Quadrant 3, Tooth 5 -> 35
    assert.strictEqual(result, 35);
  });

  await t.test('Boundary values (ratio 0.0, 1.0)', async (st) => {
    await st.test('Ratio 0.0 (Far right back)', () => {
      const implantPos: Point3D = { x: 0, y: 0, z: 20 };
      const result = mapCtCoordinatesToFdiNumber(implantPos, splinePoints);
      // normalizedRatio = 0, index = 0 -> rightTeeth[0] = 8 -> 18
      assert.strictEqual(result, 18);
    });

    await st.test('Ratio 1.0 (Far left back)', () => {
      const implantPos: Point3D = { x: 20, y: 0, z: 20 };
      const result = mapCtCoordinatesToFdiNumber(implantPos, splinePoints);
      // ratio = 1.0 -> leftTeeth length index is capped -> leftTeeth[7] = 8 -> 28
      assert.strictEqual(result, 28);
    });
  });
});
