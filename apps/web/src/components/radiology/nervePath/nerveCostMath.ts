/**
 * DENTE CRM — Vatech Gradient, Sigmoid & HU Cost Metrics (Layer 2)
 * Mandate 8b compliant (strictly <= 120 lines).
 */

export function calculateVoxelGradientMagnitude(
	volumeHU: Int16Array,
	width: number,
	height: number,
	depth: number,
	x: number,
	y: number,
	z: number,
	spacingX: number,
	spacingY: number,
	spacingZ: number,
): number {
	const sliceStride = width * height;
	const x0 = Math.max(0, x - 1), x1 = Math.min(width - 1, x + 1);
	const y0 = Math.max(0, y - 1), y1 = Math.min(height - 1, y + 1);
	const z0 = Math.max(0, z - 1), z1 = Math.min(depth - 1, z + 1);

	const baseZ = z * sliceStride;
	const baseY = y * width;

	const huX0 = volumeHU[baseZ + baseY + x0] ?? -1000;
	const huX1 = volumeHU[baseZ + baseY + x1] ?? -1000;
	const gx = (huX1 - huX0) / Math.max(0.001, (x1 - x0) * spacingX);

	const huY0 = volumeHU[baseZ + y0 * width + x] ?? -1000;
	const huY1 = volumeHU[baseZ + y1 * width + x] ?? -1000;
	const gy = (huY1 - huY0) / Math.max(0.001, (y1 - y0) * spacingY);

	const huZ0 = volumeHU[z0 * sliceStride + baseY + x] ?? -1000;
	const huZ1 = volumeHU[z1 * sliceStride + baseY + x] ?? -1000;
	const gz = (huZ1 - huZ0) / Math.max(0.001, (z1 - z0) * spacingZ);

	return Math.hypot(gx, gy, gz);
}

export function calculateVatechSigmoidVelocity(
	gradientMagnitude: number,
	alpha = -20.0,
	beta = 3.0,
): number {
	const absAlpha = Math.abs(alpha) || 20.0;
	const zeroExp = Math.exp(-beta / absAlpha);
	const exponent = (gradientMagnitude - beta) / absAlpha;
	const clampedExp = Math.max(-40.0, Math.min(40.0, exponent));
	const velocity = (1.0 + zeroExp) / (1.0 + Math.exp(clampedExp));
	return Math.max(0.001, Math.min(1.0, velocity));
}

export function calculateVoxelHuPenalty(
	hu: number,
	minCanalHU = 50,
	maxCanalHU = 350,
): number {
	if (hu >= minCanalHU && hu <= maxCanalHU) return 0.15;
	if (hu > maxCanalHU) {
		const excess = (hu - maxCanalHU) / 100.0;
		return 1.0 + excess * excess;
	}
	if (hu < 0) return 15.0;
	return 1.5;
}
