import {
	closestPointsSegmentToSegment3D,
	closestPointOnSegment3D,
	distSegmentToSegment3,
	distPointToSegment3,
	distSegmentToPolyline3,
	evaluateNerveClearance,
	evaluateImplantToNerveCanalSafety,
	checkImplantSafetyDistances,
	generateImplantMesh,
	transformImplantMesh,
	calculateImplantRadius,
	type Vec3,
	type ImplantDimensions,
	type Implant3DPlacement,
	type SafetyZoneCheckResult,
	type ImplantSafetyOptions,
	type SegmentToSegmentDistanceResult,
	type NerveCanalSafetyReport,
} from "@dental/shared";
export interface Point3D {
	x: number;
	y: number;
	z: number;
}

// Re-export canonical shared radiology primitives per Mandate 8s
export {
	closestPointsSegmentToSegment3D,
	closestPointOnSegment3D,
	distSegmentToSegment3,
	distPointToSegment3,
	distSegmentToPolyline3,
	evaluateNerveClearance,
	evaluateImplantToNerveCanalSafety,
	checkImplantSafetyDistances,
	generateImplantMesh,
	transformImplantMesh,
	calculateImplantRadius,
	type Vec3,
	type ImplantDimensions,
	type Implant3DPlacement,
	type SafetyZoneCheckResult,
	type ImplantSafetyOptions,
	type SegmentToSegmentDistanceResult,
	type NerveCanalSafetyReport,
};

/**
 * Coordinate adapter: Point3D to Vec3
 */
export function point3DToVec3(p: Point3D): Vec3 {
	return [p.x, p.y, p.z];
}

/**
 * Coordinate adapter: Vec3 to Point3D
 */
export function vec3ToPoint3D(v: Vec3): Point3D {
	return { x: v[0], y: v[1], z: v[2] };
}

export interface VirtualImplant {
	id: string;
	position: Point3D; // World coordinates of the apex (tip)
	direction: Point3D; // Normalized vector pointing towards the neck
	length: number; // mm
	diameter: number; // mm
	color?: string; // Hex color
	toothFdi?: number; // FDI tooth number for crown mockup (e.g. 46)
	system?: "osstem" | "straumann" | "nobel" | "bredent" | "mdi" | "other";
}

export interface NerveCanal {
	id: string;
	points: Point3D[]; // Spline control points in World Space
	diameter: number; // mm (default 2-3mm)
	color?: string;
}

// Global store for the current session (since we don't use Redux for 3D state to avoid overhead)
export const ClinicalStore = {
	nerves: [] as NerveCanal[],
	implants: [] as VirtualImplant[],

	listeners: [] as (() => void)[],

	subscribe(listener: () => void) {
		this.listeners.push(listener);
		return () => {
			this.listeners = this.listeners.filter((l) => l !== listener);
		};
	},

	notify() {
		this.listeners.forEach((l) => {
			l();
		});
	},

	addNervePoint(nerveId: string, pt: Point3D) {
		let nerve = this.nerves.find((n) => n.id === nerveId);
		if (!nerve) {
			nerve = { id: nerveId, points: [], diameter: 2.0, color: "#FF4500" };
			this.nerves.push(nerve);
		}
		nerve.points.push(pt);
		this.notify();
	},

	addImplant(implant: VirtualImplant) {
		this.implants.push(implant);
		if (checkImplantCollision(implant, 2.0)) {
			window.dispatchEvent(
				new CustomEvent("clinical-collision", {
					detail: {
						type: "WARNING",
						message: `Критическое расстояние: имплантат ${implant.toothFdi ? `зуба ${implant.toothFdi}` : implant.id} слишком близко к нижнечелюстному каналу!`,
					},
				}),
			);
		}
		if (implant.toothFdi) {
			window.dispatchEvent(
				new CustomEvent("clinical-implant-placed", {
					detail: { toothNumber: implant.toothFdi, implantId: implant.id },
				}),
			);
		}
		this.notify();
	},

	updateImplant(id: string, updates: Partial<VirtualImplant>) {
		const idx = this.implants.findIndex((i) => i.id === id);
		if (idx !== -1) {
			this.implants[idx] = {
				// biome-ignore lint/style/noNonNullAssertion: automated suppression
				...this.implants[idx]!,
				...updates,
			} as VirtualImplant;
			// biome-ignore lint/style/noNonNullAssertion: automated suppression
			if (checkImplantCollision(this.implants[idx]!, 2.0)) {
				window.dispatchEvent(
					new CustomEvent("clinical-collision", {
						detail: {
							type: "WARNING",
							message: `CRITICAL: Implant ${id} is too close to mandibular nerve!`,
						},
					}),
				);
			}
			this.notify();
		}
	},

	clear() {
		this.nerves = [];
		this.implants = [];
		this.notify();
	},
};

/**
 * Calculates the shortest 3D distance between two finite line segments:
 * Segment 1: [p1, p2] (Implant cylinder axis)
 * Segment 2: [q1, q2] (Nerve canal spline segment)
 *
 * Delegates to canonical @dental/shared closestPointsSegmentToSegment3D (Mandate 8s).
 */
export function distanceSegmentToSegment3D(
	p1: Point3D,
	p2: Point3D,
	q1: Point3D,
	q2: Point3D,
): { distance: number; pointOnS1: Point3D; pointOnS2: Point3D } {
	const res = closestPointsSegmentToSegment3D(
		[p1.x, p1.y, p1.z],
		[p2.x, p2.y, p2.z],
		[q1.x, q1.y, q1.z],
		[q2.x, q2.y, q2.z],
	);
	return {
		distance: res.distance,
		pointOnS1: { x: res.closestPoint1[0], y: res.closestPoint1[1], z: res.closestPoint1[2] },
		pointOnS2: { x: res.closestPoint2[0], y: res.closestPoint2[1], z: res.closestPoint2[2] },
	};
}

export interface ImplantNerveClearanceResult {
	minDistanceMm: number; // Axis-to-axis distance in mm
	clearanceMm: number; // Surface-to-surface clearance in mm
	status: "COLLISION" | "DANGER" | "CAUTION" | "SAFE";
	closestImplantPoint: Point3D;
	closestNervePoint: Point3D;
	nerveId: string;
}

/**
 * Calculates exact 3D clearance between an implant cylinder and all registered nerve canals.
 */
export function calculateImplantClearance(
	implant: VirtualImplant,
): ImplantNerveClearanceResult | null {
	if (ClinicalStore.nerves.length === 0) return null;

	const tip = implant.position;
	const neck: Point3D = {
		x: tip.x + implant.direction.x * implant.length,
		y: tip.y + implant.direction.y * implant.length,
		z: tip.z + implant.direction.z * implant.length,
	};

	const implantRadius = implant.diameter / 2;
	let minAxisDistance = Infinity;
	let bestClearance = Infinity;
	let bestPointS1: Point3D = tip;
	let bestPointS2: Point3D = tip;
	let targetNerveId = "";

	for (const nerve of ClinicalStore.nerves) {
		const nerveRadius = (nerve.diameter || 2.0) / 2;
		if (nerve.points.length === 0) continue;

		if (nerve.points.length === 1) {
			const pt = nerve.points[0];
			if (!pt) continue;
			const res = distanceSegmentToSegment3D(tip, neck, pt, pt);
			const clearance = res.distance - implantRadius - nerveRadius;
			if (clearance < bestClearance) {
				bestClearance = clearance;
				minAxisDistance = res.distance;
				bestPointS1 = res.pointOnS1;
				bestPointS2 = res.pointOnS2;
				targetNerveId = nerve.id;
			}
			continue;
		}

		for (let i = 0; i < nerve.points.length - 1; i++) {
			const q1 = nerve.points[i];
			const q2 = nerve.points[i + 1];
			if (!q1 || !q2) continue;
			const res = distanceSegmentToSegment3D(tip, neck, q1, q2);
			const clearance = res.distance - implantRadius - nerveRadius;

			if (clearance < bestClearance) {
				bestClearance = clearance;
				minAxisDistance = res.distance;
				bestPointS1 = res.pointOnS1;
				bestPointS2 = res.pointOnS2;
				targetNerveId = nerve.id;
			}
		}
	}

	if (!Number.isFinite(bestClearance)) return null;

	let status: ImplantNerveClearanceResult["status"] = "SAFE";
	if (bestClearance <= 0) {
		status = "COLLISION";
	} else if (bestClearance < 1.5) {
		status = "DANGER";
	} else if (bestClearance < 2.0) {
		status = "CAUTION";
	}

	return {
		minDistanceMm: minAxisDistance,
		clearanceMm: bestClearance,
		status,
		closestImplantPoint: bestPointS1,
		closestNervePoint: bestPointS2,
		nerveId: targetNerveId,
	};
}
/**
 * Returns true if an implant is dangerously close to any nerve canal.
 * @param implant The virtual implant to check
 * @param thresholdDistance Distance in mm that is considered "dangerously close"
 * @returns boolean true if collision/proximity detected
 */
export function checkImplantCollision(
	implant: VirtualImplant,
	thresholdDistance: number = 2.0,
): boolean {
	const res = calculateImplantClearance(implant);
	if (!res) return false;
	return res.clearanceMm < thresholdDistance;
}

/** Порог опасного сближения имплантата с нижнечелюстным каналом в мм (< 2.0 мм) */
export const MANDIBULAR_NERVE_DANGER_THRESHOLD_MM = 2.0;

export interface MinimalImplantDataForProtocol {
	fdiCode?: string | number;
	diameter?: number;
	length?: number;
	distanceToNerve?: number | null;
	boneDensity?: {
		averageHU?: number;
		classification?: string;
		drillingAdvice?: string;
	};
}

/**
 * Русский протокол по последнему импланту для ЭМК (Форма 043/у).
 */
export function implantProtocolLog(implant: MinimalImplantDataForProtocol): string {
	const nerveStatusText =
		implant.distanceToNerve != null
			? implant.distanceToNerve < MANDIBULAR_NERVE_DANGER_THRESHOLD_MM
				? `ВНИМАНИЕ: дистанция до нижнечелюстного канала ${implant.distanceToNerve.toFixed(1)} мм (< 2.0 мм) — опасная зона риска травматизации сосудисто-нервного пучка!`
				: `Дистанция до нижнечелюстного канала ${implant.distanceToNerve.toFixed(1)} мм (безопасный коридор ≥ 2.0 мм).`
			: "Нижнечелюстной нерв не размечен. Контроль дистанции безопасности невозможен.";

	const lines = [
		`--- ПРОТОКОЛ 3D-ИМПЛАНТАЦИИ (КЛКТ/DICOM) ---`,
		`Позиция зуба (FDI): № ${implant.fdiCode ?? "N/A"}`,
		`Размеры имплантата: Ø ${implant.diameter?.toFixed(1) ?? "4.0"} мм × L ${implant.length?.toFixed(1) ?? "10.0"} мм`,
		`Анатомическая безопасность: ${nerveStatusText}`,
	];

	if (implant.boneDensity) {
		lines.push(
			`Плотность кости (Misch): ${implant.boneDensity.classification ?? "D2"} (${Math.round(implant.boneDensity.averageHU ?? 950)} HU)`,
		);
		if (implant.boneDensity.drillingAdvice) {
			lines.push(`Рекомендации протокола сверления: ${implant.boneDensity.drillingAdvice}`);
		}
	}

	return lines.join("\n");
}
