import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isValidVitaShade } from "@dental/shared";

describe("dentalLabOrderModules — Smoke Facade", () => {
	it("isValidVitaShade works as expected", () => {
		assert.equal(isValidVitaShade("A2"), true);
		assert.equal(isValidVitaShade("INVALID"), false);
	});
});
