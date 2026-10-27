import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	generateTransferVerificationQrMatrix,
	generateTransferVerificationQrPayload,
} from "../branchTransferEngine.js";
import { createTestSnapshot } from "./testSnapshotHelper.js";

describe("Branch Transfer QR Code Matrix & Payload", () => {
	it("1. Generates deterministic verification payload matching statutory transfer contract", () => {
		const snapshot = createTestSnapshot();
		const payload = generateTransferVerificationQrPayload(snapshot);

		assert.ok(payload.startsWith("DENTE:TRF:"), "Payload must start with 'DENTE:TRF:' protocol prefix");
		assert.ok(payload.includes(snapshot.snapshotId), "Payload must contain the snapshotId");
		assert.ok(payload.includes(snapshot.patientId), "Payload must contain the patientId");

		const expectedPrefix = `DENTE:TRF:${snapshot.snapshotId}:${snapshot.patientId}:${snapshot.checksumSha256.slice(0, 16)}`;
		assert.equal(payload, expectedPrefix, "Payload must match canonical format DENTE:TRF:{snapshotId}:{patientId}:{sha16}");
	});

	it("2. Generates authentic ISO/IEC 18004 QR matrix with exact 7x7 Finder Patterns at 3 corners", () => {
		const snapshot = createTestSnapshot();
		const result = generateTransferVerificationQrMatrix(snapshot);

		assert.ok(result.size >= 21, `Matrix size must be at least 21 (actual: ${result.size})`);
		assert.equal(result.matrix.length, result.size, "Matrix row count must equal size");
		for (const row of result.matrix) {
			assert.equal(row.length, result.size, "Matrix column count must equal size");
		}

		const assertFinderPattern = (startRow: number, startCol: number, label: string) => {
			for (let r = 0; r < 7; r++) {
				for (let c = 0; c < 7; c++) {
					const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
					const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
					const expected = isBorder || isCenter;
					const actual = result.matrix[startRow + r]![startCol + c];
					assert.equal(actual, expected, `Finder Pattern (${label}) [${r}, ${c}] must be ${expected ? "BLACK" : "WHITE"}`);
				}
			}
		};

		assertFinderPattern(0, 0, "Top-Left");
		assertFinderPattern(0, result.size - 7, "Top-Right");
		assertFinderPattern(result.size - 7, 0, "Bottom-Left");

		let brMatchesFinderPattern = true;
		for (let r = 0; r < 7; r++) {
			for (let c = 0; c < 7; c++) {
				const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
				const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
				const expectedFinder = isBorder || isCenter;
				if (result.matrix[result.size - 7 + r]![result.size - 7 + c] !== expectedFinder) {
					brMatchesFinderPattern = false;
					break;
				}
			}
			if (!brMatchesFinderPattern) break;
		}
		assert.equal(brMatchesFinderPattern, false, "Bottom-right corner must NOT be a 7x7 finder pattern");
	});

	it("3. Features standard Timing Patterns (alternating black/white on row 6 and col 6)", () => {
		const snapshot = createTestSnapshot();
		const result = generateTransferVerificationQrMatrix(snapshot);

		for (let i = 8; i < result.size - 8; i++) {
			const expected = i % 2 === 0;
			assert.equal(result.matrix[6]![i], expected, `Horizontal timing pattern at row 6, col ${i} must alternate`);
			assert.equal(result.matrix[i]![6], expected, `Vertical timing pattern at row ${i}, col 6 must alternate`);
		}
	});
});
