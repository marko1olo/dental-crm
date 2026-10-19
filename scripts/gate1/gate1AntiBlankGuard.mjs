/**
 * scripts/gate1/gate1AntiBlankGuard.mjs
 * Anti-blank validation: file size >= 20KB and non-trivial byte/pixel variance.
 * Mandate 8b <= 120 lines.
 */

import { readFileSync, statSync } from "node:fs";
import { BYTE_GUARD_MIN } from "./gate1CaptureConstants.mjs";

export function verifyByteGuard(filePath) {
	const stats = statSync(filePath);
	if (stats.size < BYTE_GUARD_MIN) {
		throw new Error(
			`[FAIL] Anti-Blank Byte Guard: ${filePath} size is ${stats.size} bytes (< ${BYTE_GUARD_MIN} bytes floor).`
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

	if (stdDev < 15) {
		throw new Error(
			`[FAIL] Anti-Blank Variance violation: stddev ${stdDev.toFixed(2)} (< 15). Image appears blank or uniform.`
		);
	}

	return { size: stats.size, stdDev: stdDev.toFixed(2) };
}
