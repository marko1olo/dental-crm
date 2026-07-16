import type { Point3D } from "../math/mprMath";

export interface VirtualImplant {
	id: string;
	position: Point3D; // World coordinates of the apex (tip)
	direction: Point3D; // Normalized vector pointing towards the neck
	length: number; // mm
	diameter: number; // mm
	color?: string; // Hex color
	toothFdi?: number; // FDI tooth number for crown mockup (e.g. 46)
	system?: "osstem" | "straumann" | "nobel" | "bredent" | "mdi" | "other";
	/** Surgical guide sleeve parameters. Defaults: 5mm height, 5mm diameter, 9mm offset */
	sleeveHeightMm?: number;
	sleeveDiameterMm?: number;
	sleeveOffsetMm?: number;
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
		this.listeners.forEach((l) => l());
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
						message: `CRITICAL: Implant ${implant.id} is too close to mandibular nerve!`,
					},
				}),
			);
		}
		// Use actual tooth FDI if available, fallback to 46 for untargeted drops
		window.dispatchEvent(
			new CustomEvent("clinical-implant-placed", {
				detail: { toothNumber: implant.toothFdi || 46, implantId: implant.id },
			}),
		);
		this.notify();
	},

	updateImplant(id: string, updates: Partial<VirtualImplant>) {
		const idx = this.implants.findIndex((i) => i.id === id);
		if (idx !== -1) {
			this.implants[idx] = {
				...this.implants[idx]!,
				...updates,
			} as VirtualImplant;
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
 * Calculates the shortest distance between a point and a line segment
 */
function distToSegmentSquared(p: Point3D, v: Point3D, w: Point3D): number {
	const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2 + (v.z - w.z) ** 2;
	if (l2 === 0) return (p.x - v.x) ** 2 + (p.y - v.y) ** 2 + (p.z - v.z) ** 2;

	let t =
		((p.x - v.x) * (w.x - v.x) +
			(p.y - v.y) * (w.y - v.y) +
			(p.z - v.z) * (w.z - v.z)) /
		l2;
	t = Math.max(0, Math.min(1, t));

	const proj = {
		x: v.x + t * (w.x - v.x),
		y: v.y + t * (w.y - v.y),
		z: v.z + t * (w.z - v.z),
	};

	return (p.x - proj.x) ** 2 + (p.y - proj.y) ** 2 + (p.z - proj.z) ** 2;
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
	// Implant is a line segment from `position` to `position + direction * length`
	const tip = implant.position;
	const neck = {
		x: tip.x + implant.direction.x * implant.length,
		y: tip.y + implant.direction.y * implant.length,
		z: tip.z + implant.direction.z * implant.length,
	};

	const collisionDistSquared = (thresholdDistance + implant.diameter / 2) ** 2;

	for (const nerve of ClinicalStore.nerves) {
		const nerveRadius = nerve.diameter / 2;
		// Simple check: iterate over nerve points and check distance to the implant axis
		for (const pt of nerve.points) {
			const distSq = distToSegmentSquared(pt, tip, neck);
			if (distSq < collisionDistSquared + nerveRadius ** 2) {
				return true;
			}
		}
	}

	return false;
}
