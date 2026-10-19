/**
 * scripts/gate0/gate0AntiBlankGuard.mjs
 * Forensic Anti-Blank Guard: validates file size >= 20KB and byte variance stddev > 15.0.
 * Mandate 8b <= 120 lines.
 */

import { readFileSync, statSync } from "node:fs";
import { BYTE_GUARD_MIN, STDDEV_MIN } from "./gate0CaptureConstants.mjs";

export function verifyAntiBlankGuard(filePath) {
	const stats = statSync(filePath);
	if (stats.size < BYTE_GUARD_MIN) {
		throw new Error(
			`[FAIL] Anti-Blank Byte Guard violation: ${filePath} size is ${stats.size} bytes (< ${BYTE_GUARD_MIN}B floor).`
		);
	}

	const buf = readFileSync(filePath);
	if (buf.length < BYTE_GUARD_MIN) {
		throw new Error(`[FAIL] Buffer size violation for ${filePath}`);
	}

	let sum = 0;
	for (let i = 0; i < buf.length; i++) {
		sum += buf[i];
	}
	const mean = sum / buf.length;

	let varianceSum = 0;
	const sampleStep = 4;
	let sampleCount = 0;
	for (let i = 0; i < buf.length; i += sampleStep) {
		const diff = buf[i] - mean;
		varianceSum += diff * diff;
		sampleCount++;
	}
	const stdDev = Math.sqrt(varianceSum / sampleCount);

	if (stdDev < STDDEV_MIN) {
		throw new Error(
			`[FAIL] Anti-Blank Variance violation: ${filePath} stddev ${stdDev.toFixed(2)} (< ${STDDEV_MIN}). Image appears uniform or blank.`
		);
	}

	return { size: stats.size, stdDev: Number(stdDev.toFixed(2)) };
}
