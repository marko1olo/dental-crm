import type { OpgToothDetection } from "./types";

export function assignQuadrantSlots(
	teeth: OpgToothDetection[],
	quadrant: 1 | 2 | 3 | 4,
	midlineX: number,
): Map<number, OpgToothDetection> {
	const assignments = new Map<number, OpgToothDetection>();
	if (!teeth || teeth.length === 0) return assignments;

	const sorted = [...teeth].sort((a, b) => Math.abs(a.cx - midlineX) - Math.abs(b.cx - midlineX));
	const avgToothWidth = sorted.reduce((sum, t) => sum + t.width, 0) / sorted.length;
	const deltas: number[] = [];

	for (let i = 0; i < sorted.length - 1; i++) {
		const d = Math.abs(sorted[i + 1]!.cx - sorted[i]!.cx);
		if (d > 8) deltas.push(d);
	}

	let medianDelta = avgToothWidth;
	if (deltas.length > 0) {
		deltas.sort((a, b) => a - b);
		medianDelta = deltas[Math.floor(deltas.length / 2)] ?? avgToothWidth;
	}

	const effectiveSpacing = Math.max(22.0, Math.min(medianDelta, 38.0));
	let currentSlot = 1;

	for (let i = 0; i < sorted.length; i++) {
		const tooth = sorted[i]!;

		if (i === 0) {
			const distFromMidline = Math.abs(tooth.cx - midlineX);
			const initialJump = Math.round(distFromMidline / effectiveSpacing);
			if (initialJump > 1) {
				currentSlot = Math.min(8, initialJump);
			}
		} else {
			const dist = Math.abs(tooth.cx - sorted[i - 1]!.cx);
			const jump = Math.round(dist / effectiveSpacing);
			if (jump > 1) {
				currentSlot += (jump - 1);
			}
		}

		if (currentSlot > 8) currentSlot = 8;
		const fdi = quadrant * 10 + currentSlot;
		assignments.set(fdi, tooth);
		currentSlot++;
	}

	return assignments;
}
