/**
 * mprWorker.test.ts — Unit tests for MPR Web Worker Request Routing & Error Resilience
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createMprWorker } from "../index";

describe("MPR Web Worker & Worker Factory", () => {
	it("1. createMprWorker safely handles SSR/Node.js environment without throwing", () => {
		const worker = createMprWorker();
		// In pure Node.js (where window and Worker may not exist), returns null safely
		assert.equal(worker, null);
	});
});
