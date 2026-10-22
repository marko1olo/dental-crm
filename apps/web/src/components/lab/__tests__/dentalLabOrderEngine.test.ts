import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DENTAL_LAB_CONSTRUCTIONS } from "../dentalLabOrderEngine";

describe("dentalLabOrderEngine — Smoke Facade", () => {
	it("Core constructions catalog is populated", () => {
		assert.ok(Object.keys(DENTAL_LAB_CONSTRUCTIONS).length >= 6);
	});
});
