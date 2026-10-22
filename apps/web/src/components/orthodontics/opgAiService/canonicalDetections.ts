import type { OpgPathologyDetection, OpgToothDetection } from "../opgTopologicalEngine";
import { isDemoShowcaseMode } from "../../../lib/demoMode";

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

	// Верхний зубной ряд (18..11, 21..28)
	for (let s = 8; s >= 1; s--) {
		const cx = midlineX - s * spacing + spacing / 2;
		teeth.push({
			id: `1${s}`,
			cx,
			cy: upperY + (s >= 6 ? -height * 0.04 : 0),
			x1: cx - spacing * 0.45,
			y1: upperY - height * 0.08,
			x2: cx + spacing * 0.45,
			y2: upperY + height * 0.08,
			width: spacing * 0.9,
			height: height * 0.16,
			confidence: 1.0,
		});
	}
	for (let s = 1; s <= 8; s++) {
		const cx = midlineX + s * spacing - spacing / 2;
		teeth.push({
			id: `2${s}`,
			cx,
			cy: upperY + (s >= 6 ? -height * 0.04 : 0),
			x1: cx - spacing * 0.45,
			y1: upperY - height * 0.08,
			x2: cx + spacing * 0.45,
			y2: upperY + height * 0.08,
			width: spacing * 0.9,
			height: height * 0.16,
			confidence: 1.0,
		});
	}

	// Нижний зубной ряд (48..41, 31..38)
	for (let s = 8; s >= 1; s--) {
		const cx = midlineX - s * spacing + spacing / 2;
		const is48 = s === 8;
		teeth.push({
			id: `4${s}`,
			cx: is48 ? cx - spacing * 0.2 : cx,
			cy: is48 ? lowerY - height * 0.02 : lowerY + (s >= 6 ? -height * 0.02 : 0),
			x1: cx - spacing * (is48 ? 0.7 : 0.45),
			y1: lowerY - height * 0.08,
			x2: cx + spacing * (is48 ? 0.7 : 0.45),
			y2: lowerY + height * 0.08,
			width: spacing * (is48 ? 1.4 : 0.9),
			height: height * 0.16,
			confidence: 1.0,
		});
	}
	for (let s = 1; s <= 8; s++) {
		const cx = midlineX + s * spacing - spacing / 2;
		teeth.push({
			id: `3${s}`,
			cx,
			cy: lowerY + (s >= 6 ? -height * 0.02 : 0),
			x1: cx - spacing * 0.45,
			y1: lowerY - height * 0.08,
			x2: cx + spacing * 0.45,
			y2: lowerY + height * 0.08,
			width: spacing * 0.9,
			height: height * 0.16,
			confidence: 1.0,
		});
	}

	// Никаких выдуманных патологий в боевом режиме! Только в демонстрационном режиме витрины
	const pathologies: OpgPathologyDetection[] = includeDemoPathologies
		? [
				{
					id: "car-16",
					label: "caries",
					confidence: 1.0,
					x1: midlineX - 6 * spacing + spacing / 2 - spacing * 0.45,
					y1: upperY - height * 0.04 - height * 0.08,
					x2: midlineX - 6 * spacing + spacing / 2 + spacing * 0.45,
					y2: upperY - height * 0.04 + height * 0.08,
					cx: midlineX - 6 * spacing + spacing / 2,
					cy: upperY - height * 0.04,
				},
				{
					id: "car-24",
					label: "caries",
					confidence: 1.0,
					x1: midlineX + 4 * spacing - spacing / 2 - spacing * 0.45,
					y1: upperY - height * 0.08,
					x2: midlineX + 4 * spacing - spacing / 2 + spacing * 0.45,
					y2: upperY + height * 0.08,
					cx: midlineX + 4 * spacing - spacing / 2,
					cy: upperY,
				},
				{
					id: "imp-48",
					label: "impacted_tooth",
					confidence: 1.0,
					x1: midlineX - 8 * spacing + spacing / 2 - spacing * 0.7,
					y1: lowerY - height * 0.02 - height * 0.08,
					x2: midlineX - 8 * spacing + spacing / 2 + spacing * 0.7,
					y2: lowerY - height * 0.02 + height * 0.08,
					cx: midlineX - 8 * spacing + spacing / 2 - spacing * 0.2,
					cy: lowerY - height * 0.02,
				},
			]
		: [];

	return { teeth, pathologies };
}
