import { describe, it, beforeEach } from 'node:test';
import * as assert from 'node:assert';
import { checkImplantCollision, ClinicalStore, VirtualImplant } from './clinicalImplants.js';

describe('clinicalImplants - checkImplantCollision', () => {
  beforeEach(() => {
    ClinicalStore.clear();
  });

  it('should return false when no nerves exist', () => {
    const implant: VirtualImplant = {
      id: 'implant-1',
      position: { x: 0, y: 0, z: 0 },
      direction: { x: 0, y: 0, z: 1 }, // pointing up
      length: 10,
      diameter: 4,
    };

    assert.strictEqual(checkImplantCollision(implant), false);
  });

  it('should return false when implant is far from nerve', () => {
    ClinicalStore.addNervePoint('nerve-1', { x: 20, y: 0, z: 0 }); // Nerve at x=20

    const implant: VirtualImplant = {
      id: 'implant-1',
      position: { x: 0, y: 0, z: 0 },
      direction: { x: 0, y: 0, z: 1 }, // pointing up
      length: 10,
      diameter: 4,
    };

    assert.strictEqual(checkImplantCollision(implant, 2.0), false);
  });

  it('should return true when implant intersects nerve directly', () => {
    ClinicalStore.addNervePoint('nerve-1', { x: 0, y: 0, z: 5 }); // Nerve directly on implant path

    const implant: VirtualImplant = {
      id: 'implant-1',
      position: { x: 0, y: 0, z: 0 },
      direction: { x: 0, y: 0, z: 1 }, // pointing up
      length: 10,
      diameter: 4,
    };

    assert.strictEqual(checkImplantCollision(implant, 2.0), true);
  });

  it('should return true when implant is dangerously close to nerve', () => {
    // Default collisionDistance = threshold(2.0) + implantRadius(2.0) = 4.0
    // Nerve radius is nerve.diameter / 2 = 2.0 / 2 = 1.0 (by default in addNervePoint it's 2.0)
    // Distance allowed before collision: collisionDistSquared + nerveRadius^2
    // = 4^2 + 1^2 = 16 + 1 = 17 => sqrt(17) ~= 4.12

    ClinicalStore.addNervePoint('nerve-1', { x: 3.5, y: 0, z: 5 }); // Nerve is 3.5 units away from implant axis

    const implant: VirtualImplant = {
      id: 'implant-1',
      position: { x: 0, y: 0, z: 0 },
      direction: { x: 0, y: 0, z: 1 }, // pointing up
      length: 10,
      diameter: 4,
    };

    assert.strictEqual(checkImplantCollision(implant, 2.0), true);
  });

  it('should return false when implant is just outside danger zone', () => {
    ClinicalStore.addNervePoint('nerve-1', { x: 5.0, y: 0, z: 5 }); // Nerve is 5.0 units away from implant axis

    const implant: VirtualImplant = {
      id: 'implant-1',
      position: { x: 0, y: 0, z: 0 },
      direction: { x: 0, y: 0, z: 1 }, // pointing up
      length: 10,
      diameter: 4,
    };

    assert.strictEqual(checkImplantCollision(implant, 2.0), false);
  });

  it('should return false when nerve is above implant tip but further than length', () => {
    ClinicalStore.addNervePoint('nerve-1', { x: 0, y: 0, z: 15 }); // Nerve is above implant, but implant only goes to z=10

    const implant: VirtualImplant = {
      id: 'implant-1',
      position: { x: 0, y: 0, z: 0 },
      direction: { x: 0, y: 0, z: 1 }, // pointing up
      length: 10,
      diameter: 4,
    };

    assert.strictEqual(checkImplantCollision(implant, 2.0), false);
  });

  it('should return false when nerve is below implant base', () => {
    ClinicalStore.addNervePoint('nerve-1', { x: 0, y: 0, z: -5 }); // Nerve is below implant

    const implant: VirtualImplant = {
      id: 'implant-1',
      position: { x: 0, y: 0, z: 0 },
      direction: { x: 0, y: 0, z: 1 }, // pointing up
      length: 10,
      diameter: 4,
    };

    assert.strictEqual(checkImplantCollision(implant, 2.0), false);
  });
});
