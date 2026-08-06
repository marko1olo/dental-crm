import * as assert from "node:assert";
import { beforeEach, describe, it } from "node:test";
import {
	ClinicalStore,
	checkImplantCollision,
	type VirtualImplant,
} from "./clinicalImplants.js";

describe("clinicalImplants - checkImplantCollision", () => {
	beforeEach(() => {
		ClinicalStore.clear();
	});

	it("should return false when no nerves exist", () => {
		const implant: VirtualImplant = {
			id: "implant-1",
			position: { x: 0, y: 0, z: 0 },
			direction: { x: 0, y: 0, z: 1 }, // pointing up
			length: 10,
			diameter: 4,
		};

		assert.strictEqual(checkImplantCollision(implant), false);
	});

	it("should return false when implant is far from nerve", () => {
		ClinicalStore.addNervePoint("nerve-1", { x: 20, y: 0, z: 0 }); // Nerve at x=20

		const implant: VirtualImplant = {
			id: "implant-1",
			position: { x: 0, y: 0, z: 0 },
			direction: { x: 0, y: 0, z: 1 }, // pointing up
			length: 10,
			diameter: 4,
		};

		assert.strictEqual(checkImplantCollision(implant, 2.0), false);
	});

	it("should return true when implant intersects nerve directly", () => {
		ClinicalStore.addNervePoint("nerve-1", { x: 0, y: 0, z: 5 }); // Nerve directly on implant path

		const implant: VirtualImplant = {
			id: "implant-1",
			position: { x: 0, y: 0, z: 0 },
			direction: { x: 0, y: 0, z: 1 }, // pointing up
			length: 10,
			diameter: 4,
		};

		assert.strictEqual(checkImplantCollision(implant, 2.0), true);
	});

	it("should return true when implant is dangerously close to nerve", () => {
		// Default collisionDistance = threshold(2.0) + implantRadius(2.0) = 4.0
		// Nerve radius is nerve.diameter / 2 = 2.0 / 2 = 1.0 (by default in addNervePoint it's 2.0)
		// Distance allowed before collision: collisionDistSquared + nerveRadius^2
		// = 4^2 + 1^2 = 16 + 1 = 17 => sqrt(17) ~= 4.12

		ClinicalStore.addNervePoint("nerve-1", { x: 3.5, y: 0, z: 5 }); // Nerve is 3.5 units away from implant axis

		const implant: VirtualImplant = {
			id: "implant-1",
			position: { x: 0, y: 0, z: 0 },
			direction: { x: 0, y: 0, z: 1 }, // pointing up
			length: 10,
			diameter: 4,
		};

		assert.strictEqual(checkImplantCollision(implant, 2.0), true);
	});

	it("should return false when implant is just outside danger zone", () => {
		ClinicalStore.addNervePoint("nerve-1", { x: 5.0, y: 0, z: 5 }); // Nerve is 5.0 units away from implant axis

		const implant: VirtualImplant = {
			id: "implant-1",
			position: { x: 0, y: 0, z: 0 },
			direction: { x: 0, y: 0, z: 1 }, // pointing up
			length: 10,
			diameter: 4,
		};

		assert.strictEqual(checkImplantCollision(implant, 2.0), false);
	});

	it("should return false when nerve is above implant tip but further than length", () => {
		ClinicalStore.addNervePoint("nerve-1", { x: 0, y: 0, z: 15 }); // Nerve is above implant, but implant only goes to z=10

		const implant: VirtualImplant = {
			id: "implant-1",
			position: { x: 0, y: 0, z: 0 },
			direction: { x: 0, y: 0, z: 1 }, // pointing up
			length: 10,
			diameter: 4,
		};

		assert.strictEqual(checkImplantCollision(implant, 2.0), false);
	});

	it("should return false when nerve is below implant base", () => {
		ClinicalStore.addNervePoint("nerve-1", { x: 0, y: 0, z: -5 }); // Nerve is below implant

		const implant: VirtualImplant = {
			id: "implant-1",
			position: { x: 0, y: 0, z: 0 },
			direction: { x: 0, y: 0, z: 1 }, // pointing up
			length: 10,
			diameter: 4,
		};

		assert.strictEqual(checkImplantCollision(implant, 2.0), false);
	});

	it("should respect custom threshold distance", () => {
		ClinicalStore.addNervePoint("nerve-1", { x: 6, y: 0, z: 5 });

		const implant: VirtualImplant = {
			id: "implant-1",
			position: { x: 0, y: 0, z: 0 },
			direction: { x: 0, y: 0, z: 1 },
			length: 10,
			diameter: 4,
		};

		// collisionDistSquared = (threshold + 2.0)^2
		// nerve is 6.0 away. nerveRadius = 1.0 (from 2.0/2 diameter)
		// distance allowed: (threshold + 2.0)^2 + 1.0
		// actual distance squared is 6^2 = 36
		// If threshold = 2.0, threshold+2 = 4, 16+1 = 17, 36 < 17 is false
		assert.strictEqual(checkImplantCollision(implant, 2.0), false);

		// If threshold = 5.0, threshold+2 = 7, 49+1 = 50, 36 < 50 is true
		assert.strictEqual(checkImplantCollision(implant, 5.0), true);
	});

	it("should use default threshold distance if omitted", () => {
		// Default threshold is 2.0
		ClinicalStore.addNervePoint("nerve-1", { x: 3.5, y: 0, z: 5 });

		const implant: VirtualImplant = {
			id: "implant-1",
			position: { x: 0, y: 0, z: 0 },
			direction: { x: 0, y: 0, z: 1 },
			length: 10,
			diameter: 4,
		};

		assert.strictEqual(checkImplantCollision(implant), true);

		ClinicalStore.clear();
		ClinicalStore.addNervePoint("nerve-1", { x: 5.0, y: 0, z: 5 });

		assert.strictEqual(checkImplantCollision(implant), false);
	});

	it("should correctly detect collision with a non-axis-aligned implant", () => {
		ClinicalStore.addNervePoint("nerve-1", { x: 5, y: 5, z: 5 });

		const implant: VirtualImplant = {
			id: "implant-1",
			position: { x: 0, y: 0, z: 0 },
			// 45 degree angle in x-y plane
			direction: { x: Math.sqrt(0.5), y: Math.sqrt(0.5), z: 0 },
			length: 10,
			diameter: 4,
		};

		// The segment goes from (0,0,0) to approx (7.07, 7.07, 0)
		// Nerve is at (5, 5, 5). Shortest distance is to (5, 5, 0), which is dist=5.
		// Allowed distance squared: (2.0 + 2.0)^2 + 1.0 = 17.
		// Actual distance squared is 5^2 = 25. 25 < 17 is false.
		assert.strictEqual(checkImplantCollision(implant, 2.0), false);

		// Now move nerve point closer to the implant
		ClinicalStore.clear();
		ClinicalStore.addNervePoint("nerve-1", { x: 5, y: 5, z: 3.5 });

		// Actual distance squared is 3.5^2 = 12.25. 12.25 < 17 is true.
		assert.strictEqual(checkImplantCollision(implant, 2.0), true);
	});

	it("should detect collision when only one of multiple nerve points is close", () => {
		ClinicalStore.addNervePoint("nerve-1", { x: 20, y: 0, z: 5 });
		ClinicalStore.addNervePoint("nerve-1", { x: 15, y: 0, z: 5 });
		ClinicalStore.addNervePoint("nerve-1", { x: 3.5, y: 0, z: 5 }); // close point

		const implant: VirtualImplant = {
			id: "implant-1",
			position: { x: 0, y: 0, z: 0 },
			direction: { x: 0, y: 0, z: 1 },
			length: 10,
			diameter: 4,
		};

		assert.strictEqual(checkImplantCollision(implant, 2.0), true);
	});

	it("should return false if all points in a multi-point nerve are far", () => {
		ClinicalStore.addNervePoint("nerve-1", { x: 20, y: 0, z: 5 });
		ClinicalStore.addNervePoint("nerve-1", { x: 15, y: 0, z: 5 });
		ClinicalStore.addNervePoint("nerve-1", { x: 10, y: 0, z: 5 });

		const implant: VirtualImplant = {
			id: "implant-1",
			position: { x: 0, y: 0, z: 0 },
			direction: { x: 0, y: 0, z: 1 },
			length: 10,
			diameter: 4,
		};

		assert.strictEqual(checkImplantCollision(implant, 2.0), false);
	});

	it("should detect collision across multiple nerves", () => {
		ClinicalStore.addNervePoint("nerve-1", { x: 20, y: 0, z: 5 }); // Far nerve
		ClinicalStore.addNervePoint("nerve-2", { x: 3.5, y: 0, z: 5 }); // Close nerve

		const implant: VirtualImplant = {
			id: "implant-1",
			position: { x: 0, y: 0, z: 0 },
			direction: { x: 0, y: 0, z: 1 },
			length: 10,
			diameter: 4,
		};

		assert.strictEqual(checkImplantCollision(implant, 2.0), true);
	});

	it("should handle zero-length implants correctly", () => {
		ClinicalStore.addNervePoint("nerve-1", { x: 0, y: 0, z: 3.5 });

		const implant: VirtualImplant = {
			id: "implant-1",
			position: { x: 0, y: 0, z: 0 },
			direction: { x: 0, y: 0, z: 1 },
			length: 0, // Zero length
			diameter: 4,
		};

		// The implant is just a point at (0,0,0).
		// Distance to nerve (0,0,3.5) is 3.5. Squared is 12.25.
		// Allowed distance squared is 17.
		assert.strictEqual(checkImplantCollision(implant, 2.0), true);
	});
});
