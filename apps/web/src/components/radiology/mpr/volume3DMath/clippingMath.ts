export function isPointInsideClippingBox(
	uvw: [number, number, number],
	clipMin: [number, number, number],
	clipMax: [number, number, number],
): boolean {
	return (
		uvw[0] >= clipMin[0] &&
		uvw[0] <= clipMax[0] &&
		uvw[1] >= clipMin[1] &&
		uvw[1] <= clipMax[1] &&
		uvw[2] >= clipMin[2] &&
		uvw[2] <= clipMax[2]
	);
}

export function getSafeDevicePixelRatio(dpr?: number): number {
	const val =
		typeof dpr === "number" && !Number.isNaN(dpr)
			? dpr
			: typeof window !== "undefined"
				? window.devicePixelRatio || 1
				: 1;
	return Math.min(1.5, Math.max(1.0, val));
}

export function cleanZero(val: number): number {
	return Math.abs(val) < 1e-9 ? 0 : val;
}
