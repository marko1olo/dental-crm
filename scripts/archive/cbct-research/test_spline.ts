function solveTridiagonal(
	a: readonly number[],
	b: readonly number[],
	c: readonly number[],
	d: readonly number[],
): number[] {
	const n = b.length;
	const cPrime = new Float64Array(n);
	const dPrime = new Float64Array(n);
	const x = new Array<number>(n);

	cPrime[0] = c[0] / b[0];
	dPrime[0] = d[0] / b[0];

	for (let i = 1; i < n; i++) {
		const m = b[i] - a[i] * cPrime[i - 1];
		if (i < n - 1) {
			cPrime[i] = c[i] / m;
		}
		dPrime[i] = (d[i] - a[i] * dPrime[i - 1]) / m;
	}

	x[n - 1] = dPrime[n - 1];
	for (let i = n - 2; i >= 0; i--) {
		x[i] = dPrime[i] - cPrime[i] * x[i + 1];
	}

	return x;
}

export function fitC2ClampedCubicSpline(
	points: readonly { x: number; y: number }[],
	samplesPerSegment = 8,
): { x: number; y: number }[] {
	if (!points || points.length === 0) return [];
	if (points.length === 1) return [{ ...points[0]! }];

	const pts = [points[0]!];
	for (let i = 1; i < points.length; i++) {
		const prev = pts[pts.length - 1]!;
		const cur = points[i]!;
		if (Math.hypot(cur.x - prev.x, cur.y - prev.y) > 0.1) {
			pts.push(cur);
		}
	}
	const n = pts.length;
	if (n < 2) return [{ ...pts[0]! }];

	const h = new Float64Array(n - 1);
	for (let i = 0; i < n - 1; i++) {
		h[i] = Math.max(1e-4, Math.hypot(pts[i + 1]!.x - pts[i]!.x, pts[i + 1]!.y - pts[i]!.y));
	}

	// X: clamped boundary conditions x'(0) = 0, x'(L) = 0
	const aX = new Float64Array(n);
	const bX = new Float64Array(n);
	const cX = new Float64Array(n);
	const dX = new Float64Array(n);

	bX[0] = 2 * h[0];
	cX[0] = h[0];
	dX[0] = 6 * ((pts[1]!.x - pts[0]!.x) / h[0]);

	for (let i = 1; i < n - 1; i++) {
		aX[i] = h[i - 1];
		bX[i] = 2 * (h[i - 1] + h[i]);
		cX[i] = h[i];
		dX[i] = 6 * ((pts[i + 1]!.x - pts[i]!.x) / h[i] - (pts[i]!.x - pts[i - 1]!.x) / h[i - 1]);
	}

	aX[n - 1] = h[n - 2];
	bX[n - 1] = 2 * h[n - 2];
	dX[n - 1] = 6 * (0 - (pts[n - 1]!.x - pts[n - 2]!.x) / h[n - 2]);

	const mX = solveTridiagonal(aX as any, bX as any, cX as any, dX as any);

	// Y: natural boundary conditions y''(0) = 0, y''(L) = 0
	const aY = new Float64Array(n);
	const bY = new Float64Array(n);
	const cY = new Float64Array(n);
	const dY = new Float64Array(n);

	bY[0] = 1;
	cY[0] = 0;
	dY[0] = 0;

	for (let i = 1; i < n - 1; i++) {
		aY[i] = h[i - 1];
		bY[i] = 2 * (h[i - 1] + h[i]);
		cY[i] = h[i];
		dY[i] = 6 * ((pts[i + 1]!.y - pts[i]!.y) / h[i] - (pts[i]!.y - pts[i - 1]!.y) / h[i - 1]);
	}

	aY[n - 1] = 0;
	bY[n - 1] = 1;
	dY[n - 1] = 0;

	const mY = solveTridiagonal(aY as any, bY as any, cY as any, dY as any);

	const curve: { x: number; y: number }[] = [];
	const numSamples = Math.max(2, samplesPerSegment);

	for (let i = 0; i < n - 1; i++) {
		const hI = h[i];
		const x0 = pts[i]!.x;
		const x1 = pts[i + 1]!.x;
		const y0 = pts[i]!.y;
		const y1 = pts[i + 1]!.y;
		const mx0 = mX[i]!;
		const mx1 = mX[i + 1]!;
		const my0 = mY[i]!;
		const my1 = mY[i + 1]!;

		const stepLimit = (i === n - 2) ? numSamples : (numSamples - 1);
		for (let s = 0; s <= stepLimit; s++) {
			const u = s / numSamples;
			const aCoeff = 1 - u;
			const bCoeff = u;
			const hSqOver6 = (hI * hI) / 6.0;

			const xVal = aCoeff * x0 + bCoeff * x1 + hSqOver6 * ((aCoeff * aCoeff * aCoeff - aCoeff) * mx0 + (bCoeff * bCoeff * bCoeff - bCoeff) * mx1);
			const yVal = aCoeff * y0 + bCoeff * y1 + hSqOver6 * ((aCoeff * aCoeff * aCoeff - aCoeff) * my0 + (bCoeff * bCoeff * bCoeff - bCoeff) * my1);

			if (Number.isFinite(xVal) && Number.isFinite(yVal)) {
				curve.push({
					x: Number(xVal.toFixed(2)),
					y: Number(yVal.toFixed(2)),
				});
			}
		}
	}

	return curve;
}

const testAnchors = [
  { x: -30, y: 5 },
  { x: -30, y: 0 },
  { x: -30, y: -12 },
  { x: -29.5, y: -24 },
  { x: -26, y: -34 },
  { x: -22, y: -42 },
  { x: -16, y: -48 },
  { x: -9, y: -52 },
  { x: -2.5, y: -54 },
  { x: 2.5, y: -54 },
  { x: 9, y: -52 },
  { x: 16, y: -48 },
  { x: 22, y: -42 },
  { x: 26, y: -34 },
  { x: 29.5, y: -24 },
  { x: 30, y: -12 },
  { x: 30, y: 0 },
  { x: 30, y: 5 },
];

const curve = fitC2ClampedCubicSpline(testAnchors, 8);
console.log("Points count:", curve.length);
console.log("Start point:", curve[0]);
console.log("Points 1..5:", curve.slice(0, 5));
console.log("Apex area:", curve.slice(curve.length / 2 - 2, curve.length / 2 + 2));
console.log("End point:", curve[curve.length - 1]);
