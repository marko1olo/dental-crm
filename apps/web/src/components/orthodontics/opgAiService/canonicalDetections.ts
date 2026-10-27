import type { OpgPathologyDetection, OpgToothDetection } from "../opgTopologicalEngine";
import { isDemoShowcaseMode } from "../../../lib/demoMode";

function createTooth(id: string, cx: number, cy: number, w: number, h: number): OpgToothDetection {
	return { id, cx, cy, x1: cx - w / 2, y1: cy - h / 2, x2: cx + w / 2, y2: cy + h / 2, width: w, height: h, confidence: 1.0 };
}

export function generateCanonicalToothDetections(
	width = 1024,
	height = 574,
	includeDemoPathologies = isDemoShowcaseMode(),
): { teeth: OpgToothDetection[]; pathologies: OpgPathologyDetection[] } {
	const teeth: OpgToothDetection[] = [];
	const midlineX = width / 2.0;
	const spacing = width * 0.032;
	const upperY = height * 0.38;
	const lowerY = height * 0.65;
	const tW = spacing * 0.9;
	const tH = height * 0.16;

	for (let s = 8; s >= 1; s--) {
		const cx = midlineX - s * spacing + spacing / 2;
		teeth.push(createTooth(`1${s}`, cx, upperY + (s >= 6 ? -height * 0.04 : 0), tW, tH));
	}
	for (let s = 1; s <= 8; s++) {
		const cx = midlineX + s * spacing - spacing / 2;
		teeth.push(createTooth(`2${s}`, cx, upperY + (s >= 6 ? -height * 0.04 : 0), tW, tH));
	}
	for (let s = 8; s >= 1; s--) {
		const is48 = s === 8;
		const cx = midlineX - s * spacing + spacing / 2 - (is48 ? spacing * 0.2 : 0);
		teeth.push(createTooth(`4${s}`, cx, is48 ? lowerY - height * 0.02 : lowerY + (s >= 6 ? -height * 0.02 : 0), is48 ? spacing * 1.4 : tW, tH));
	}
	for (let s = 1; s <= 8; s++) {
		const cx = midlineX + s * spacing - spacing / 2;
		teeth.push(createTooth(`3${s}`, cx, lowerY + (s >= 6 ? -height * 0.02 : 0), tW, tH));
	}

	const pathologies: OpgPathologyDetection[] = includeDemoPathologies
		? [
				{
					id: "car-16", label: "caries", confidence: 1.0,
					x1: midlineX - 6 * spacing + spacing / 2 - spacing * 0.45,
					y1: upperY - height * 0.04 - height * 0.08,
					x2: midlineX - 6 * spacing + spacing / 2 + spacing * 0.45,
					y2: upperY - height * 0.04 + height * 0.08,
					cx: midlineX - 6 * spacing + spacing / 2, cy: upperY - height * 0.04,
				},
				{
					id: "car-24", label: "caries", confidence: 1.0,
					x1: midlineX + 4 * spacing - spacing / 2 - spacing * 0.45,
					y1: upperY - height * 0.08,
					x2: midlineX + 4 * spacing - spacing / 2 + spacing * 0.45,
					y2: upperY + height * 0.08,
					cx: midlineX + 4 * spacing - spacing / 2, cy: upperY,
				},
				{
					id: "imp-48", label: "impacted_tooth", confidence: 1.0,
					x1: midlineX - 8 * spacing + spacing / 2 - spacing * 0.7,
					y1: lowerY - height * 0.02 - height * 0.08,
					x2: midlineX - 8 * spacing + spacing / 2 + spacing * 0.7,
					y2: lowerY - height * 0.02 + height * 0.08,
					cx: midlineX - 8 * spacing + spacing / 2 - spacing * 0.2, cy: lowerY - height * 0.02,
				},
			]
		: [];

	return { teeth, pathologies };
}
