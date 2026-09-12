/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL RADIOLOGY & CBCT: SURGICAL GUIDE SAFETY & CLEARANCE VALIDATOR
 * ═══════════════════════════════════════════════════════════════════════════
 * Pure analytical validation of dental surgical drill guides:
 *  - Inter-implant clearance (>= 1.5 mm between adjacent implants)
 *  - Mandibular inferior alveolar nerve (IAN) safety distance (>= 2.0 mm)
 *  - Maxillary sinus floor safety distance (>= 1.0 mm)
 *  - Cortical bone thickness of alveolar plate (>= 1.0 mm buccal/lingual)
 *  - Guided bur drill overshoot past apex (DRILL_OVERSHOOT_MM = 2.0 mm)
 *  - 3D-printing resin sleeve housing wall thickness (MIN_WALL_MM = 1.0 mm)
 *  - Drill channel bur diameter clearance (MIN_DRILL_MM = 1.8 mm)
 *  - Fragile resin web between adjacent drill bores (MIN_WALL_MM = 1.0 mm)
 *
 * Adapted from DenCT core/guideValidate.ts for dental outpatient chairside care.
 * Pure TypeScript, zero external dependencies, 100% unit-testable.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export type Vec3 = [number, number, number];

/** Minimum printable resin wall thickness in mm for SLA/DLP dental resin printers. */
export const MIN_WALL_MM = 1.0;

/** Smallest standard guided-drill bur diameter in mm. */
export const MIN_DRILL_MM = 1.8;

/** Standard clinical bur overshoot past implant apex in mm. */
export const DRILL_OVERSHOOT_MM = 2.0;

/** Minimum clinical clearance between adjacent implant bodies in mm. */
export const MIN_INTER_IMPLANT_CLEARANCE_MM = 1.5;

/** Mandatory safety clearance from implant/drill bur to mandibular nerve canal in mm. */
export const MIN_NERVE_SAFETY_MM = 2.0;

/** Mandatory safety clearance from implant/drill bur to maxillary sinus floor in mm. */
export const MIN_SINUS_SAFETY_MM = 1.0;

/** Recommended minimum buccal and lingual cortical plate thickness in mm. */
export const MIN_CORTICAL_PLATE_MM = 1.0;

// ── 3D Geometric Vector Math ───────────────────────────────────

function sub3(a: Vec3, b: Vec3): Vec3 {
	return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function dot3(a: Vec3, b: Vec3): number {
	return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

/**
 * Shortest Euclidean distance from point p to 3D line segment [a, b].
 */
export function distPointToSegment3(p: Vec3, a: Vec3, b: Vec3): number {
	const ab = sub3(b, a);
	const len2 = dot3(ab, ab);
	let t = len2 > 0 ? dot3(sub3(p, a), ab) / len2 : 0;
	t = Math.max(0, Math.min(1, t));
	const c: Vec3 = [a[0] + ab[0] * t, a[1] + ab[1] * t, a[2] + ab[2] * t];
	return Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2]);
}

/**
 * Shortest Euclidean distance between two 3D line segments [p1, q1] and [p2, q2].
 * Standard robust clamped closest-point algorithm.
 */
export function distSegmentToSegment3(
	p1: Vec3,
	q1: Vec3,
	p2: Vec3,
	q2: Vec3,
): number {
	const d1 = sub3(q1, p1);
	const d2 = sub3(q2, p2);
	const r = sub3(p1, p2);
	const a = dot3(d1, d1);
	const e = dot3(d2, d2);
	const f = dot3(d2, r);
	const EPS = 1e-9;

	let s: number;
	let t: number;

	if (a <= EPS && e <= EPS) {
		return Math.hypot(r[0], r[1], r[2]);
	}

	if (a <= EPS) {
		s = 0;
		t = Math.max(0, Math.min(1, f / e));
	} else {
		const c = dot3(d1, r);
		if (e <= EPS) {
			t = 0;
			s = Math.max(0, Math.min(1, -c / a));
		} else {
			const b = dot3(d1, d2);
			const denom = a * e - b * b;
			s = denom > EPS ? Math.max(0, Math.min(1, (b * f - c * e) / denom)) : 0;
			t = (b * s + f) / e;
			if (t < 0) {
				t = 0;
				s = Math.max(0, Math.min(1, -c / a));
			} else if (t > 1) {
				t = 1;
				s = Math.max(0, Math.min(1, (b - c) / a));
			}
		}
	}

	const c1: Vec3 = [p1[0] + d1[0] * s, p1[1] + d1[1] * s, p1[2] + d1[2] * s];
	const c2: Vec3 = [p2[0] + d2[0] * t, p2[1] + d2[1] * t, p2[2] + d2[2] * t];
	return Math.hypot(c1[0] - c2[0], c1[1] - c2[1], c1[2] - c2[2]);
}

/**
 * Shortest Euclidean distance between 3D segment [a, b] and a 3D polyline.
 */
export function distSegmentToPolyline3(
	a: Vec3,
	b: Vec3,
	poly: Vec3[],
): number {
	if (poly.length === 0) return Infinity;
	if (poly.length === 1) return distPointToSegment3(poly[0]!, a, b);

	let min = Infinity;
	for (let i = 0; i < poly.length - 1; i++) {
		const d = distSegmentToSegment3(a, b, poly[i]!, poly[i + 1]!);
		if (d < min) min = d;
	}
	return min;
}

// ── Types & Interfaces ─────────────────────────────────────────

export interface GuideCheckImplant {
	id?: string;
	/** Coronal entry point in world mm (platform) */
	entry: Vec3;
	/** Normalized unit axis vector pointing entry -> apex */
	axis: Vec3;
	/** Implant length in mm */
	length: number;
	/** Implant diameter at widest part in mm (used for body clearance) */
	diameter?: number;
	/** Outer metal sleeve bushing diameter in mm */
	sleeveDiameter: number;
	/** Sleeve bottom offset distance from implant platform along axis in mm */
	sleeveOffset: number;
	/** Sleeve cylinder height in mm */
	sleeveHeight: number;
	/** Measured bone cortical plate thickness at coronal entry (buccal in mm) */
	buccalCorticalMm?: number;
	/** Measured bone cortical plate thickness at coronal entry (lingual in mm) */
	lingualCorticalMm?: number;
}

export interface GuideParams {
	/** Sleeve housing outer resin wall thickness in mm */
	wallMm: number;
	/** Wall thickness of metal sleeve bushing in mm */
	sleeveWallMm: number;
	/** Radial channel tolerance in mm */
	channelTolMm: number;
	/** Presence of shoulder stop seat */
	sleeveSeat?: boolean;
}

export interface AnatomyMarker {
	id: string;
	type: "nerve" | "sinus";
	points: Vec3[];
	radius: number; // Safety tube radius in mm
	name?: string;
}

export type GuideIssueSeverity = "error" | "warning";

export interface GuideIssue {
	code:
		| "thinWall"
		| "narrowChannel"
		| "boresClose"
		| "implantClearance"
		| "drillNerve"
		| "drillSinus"
		| "thinCorticalPlate";
	severity: GuideIssueSeverity;
	detail?: string;
	implantId?: string;
	pairImplantId?: string;
}

export interface GuideCheckInput {
	implants: GuideCheckImplant[];
	params: GuideParams;
	anatomy?: AnatomyMarker[];
	thresholds?: {
		nerve: number;
		sinus: number;
		interImplant?: number;
		corticalPlate?: number;
	};
}

export const GUIDE_DEFAULTS: GuideParams = {
	wallMm: 1.5,
	sleeveWallMm: 0.9,
	channelTolMm: 0.1,
	sleeveSeat: true,
};

const f1 = (x: number): string => (Math.round(x * 10) / 10).toFixed(1);

const at = (imp: GuideCheckImplant, t: number): Vec3 => [
	imp.entry[0] + imp.axis[0] * t,
	imp.entry[1] + imp.axis[1] * t,
	imp.entry[2] + imp.axis[2] * t,
];

/**
 * Computes inner drill-channel radius for an implant respecting sleeve-seat mode.
 */
export function drillRadius(
	imp: GuideCheckImplant,
	params: GuideParams,
): number {
	if (params.sleeveSeat) {
		const innerD = Math.max(0.5, imp.sleeveDiameter - 2 * params.sleeveWallMm);
		return innerD / 2 + params.channelTolMm;
	}
	return (imp.sleeveDiameter + params.channelTolMm) / 2;
}

// ── Validation Suite ───────────────────────────────────────────

/**
 * Validates a surgical guide plan for printability, inter-implant clearances,
 * nerve/sinus drill trajectory safety, and cortical bone plate thickness.
 * Returns issues sorted errors-first; empty array indicates clean validation.
 */
export function validateGuide(input: GuideCheckInput): GuideIssue[] {
	const { implants, params } = input;
	const thr = {
		nerve: input.thresholds?.nerve ?? MIN_NERVE_SAFETY_MM,
		sinus: input.thresholds?.sinus ?? MIN_SINUS_SAFETY_MM,
		interImplant:
			input.thresholds?.interImplant ?? MIN_INTER_IMPLANT_CLEARANCE_MM,
		corticalPlate:
			input.thresholds?.corticalPlate ?? MIN_CORTICAL_PLATE_MM,
	};
	const issues: GuideIssue[] = [];

	// 1. Sleeve housing resin wall thickness check
	if (params.wallMm < MIN_WALL_MM) {
		issues.push({
			code: "thinWall",
			severity: "warning",
			detail: `${f1(params.wallMm)} mm`,
		});
	}

	// 2. Drill channel bur diameter check
	for (const imp of implants) {
		const d = drillRadius(imp, params) * 2;
		if (d < MIN_DRILL_MM) {
			issues.push({
				code: "narrowChannel",
				severity: "warning",
				detail: `${f1(d)} mm`,
				...(imp.id ? { implantId: imp.id } : {}),
			});
			break;
		}
	}

	// 3. Inter-implant clearance and drill bores web check
	for (let i = 0; i < implants.length; i++) {
		for (let j = i + 1; j < implants.length; j++) {
			const A = implants[i]!;
			const B = implants[j]!;

			// 3a. Implant body clearance (>= 1.5 mm requirement)
			const aApex = at(A, A.length);
			const bApex = at(B, B.length);
			const aRadius = (A.diameter ?? A.sleeveDiameter * 0.75) / 2;
			const bRadius = (B.diameter ?? B.sleeveDiameter * 0.75) / 2;

			const bodyCenterDist = distSegmentToSegment3(
				A.entry,
				aApex,
				B.entry,
				bApex,
			);
			const bodyClearance = bodyCenterDist - aRadius - bRadius;

			if (bodyClearance < thr.interImplant) {
				issues.push({
					code: "implantClearance",
					severity: bodyClearance < 0 ? "error" : "warning",
					detail: `${f1(Math.max(0, bodyClearance))} mm`,
					...(A.id ? { implantId: A.id } : {}),
					...(B.id ? { pairImplantId: B.id } : {}),
				});
			}

			// 3b. Guided drill shaft web (including overshoot)
			const aTip = at(A, A.length + DRILL_OVERSHOOT_MM);
			const bTip = at(B, B.length + DRILL_OVERSHOOT_MM);
			const gap =
				distSegmentToPolyline3(A.entry, aTip, [B.entry, bTip]) -
				drillRadius(A, params) -
				drillRadius(B, params);

			if (gap < MIN_WALL_MM) {
				issues.push({
					code: "boresClose",
					severity: gap < 0 ? "error" : "warning",
					detail: `${f1(Math.max(0, gap))} mm`,
					...(A.id ? { implantId: A.id } : {}),
					...(B.id ? { pairImplantId: B.id } : {}),
				});
			}
		}
	}

	// 4. Drill-path collision with marked anatomy (drill overshoots apex by 2 mm)
	const markers = (input.anatomy ?? []).filter(
		(m) => m.points && m.points.length > 0,
	);
	for (const imp of implants) {
		const tip = at(imp, imp.length + DRILL_OVERSHOOT_MM);
		const dr = drillRadius(imp, params);
		for (const m of markers) {
			const clearance =
				distSegmentToPolyline3(imp.entry, tip, m.points) - m.radius - dr;
			const limit = m.type === "nerve" ? thr.nerve : thr.sinus;
			if (clearance < limit) {
				issues.push({
					code: m.type === "nerve" ? "drillNerve" : "drillSinus",
					severity: clearance < 0 ? "error" : "warning",
					detail: `${f1(clearance)} mm`,
					...(imp.id ? { implantId: imp.id } : {}),
				});
			}
		}
	}

	// 5. Cortical bone plate thickness verification
	for (const imp of implants) {
		if (
			imp.buccalCorticalMm !== undefined &&
			imp.buccalCorticalMm < thr.corticalPlate
		) {
			issues.push({
				code: "thinCorticalPlate",
				severity: imp.buccalCorticalMm < 0.5 ? "error" : "warning",
				detail: `Вестибулярная: ${f1(imp.buccalCorticalMm)} мм (норма >= ${f1(thr.corticalPlate)} мм)`,
				...(imp.id ? { implantId: imp.id } : {}),
			});
		}
		if (
			imp.lingualCorticalMm !== undefined &&
			imp.lingualCorticalMm < thr.corticalPlate
		) {
			issues.push({
				code: "thinCorticalPlate",
				severity: imp.lingualCorticalMm < 0.5 ? "error" : "warning",
				detail: `Оральная: ${f1(imp.lingualCorticalMm)} мм (норма >= ${f1(thr.corticalPlate)} мм)`,
				...(imp.id ? { implantId: imp.id } : {}),
			});
		}
	}

	// Errors first, then warnings; stable within a severity
	return issues.sort((a, b) =>
		a.severity === b.severity ? 0 : a.severity === "error" ? -1 : 1,
	);
}
