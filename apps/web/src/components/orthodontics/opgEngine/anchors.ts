import type { OpgToothDetection } from "./types";

export function detectDentalMidline(
	teeth: OpgToothDetection[],
	imgWidth: number,
): number {
	if (!teeth || teeth.length === 0) return imgWidth / 2.0;

	const halfW = imgWidth / 2.0;
	const centralCandidates = [...teeth].sort(
		(a, b) => Math.abs(a.cx - halfW) - Math.abs(b.cx - halfW),
	);

	if (centralCandidates.length >= 2) {
		const t1 = centralCandidates[0]!;
		const t2 = centralCandidates[1]!;
		if (Math.abs(t1.cx - t2.cx) < imgWidth * 0.15) {
			return (t1.cx + t2.cx) / 2.0;
		}
	}
	return centralCandidates[0]?.cx ?? halfW;
}

export function partitionUpperLowerJaws(
	teeth: OpgToothDetection[],
	imgHeight = 600,
): { upper: OpgToothDetection[]; lower: OpgToothDetection[]; splitY: number } {
	if (!teeth || teeth.length === 0) {
		return { upper: [], lower: [], splitY: imgHeight / 2.0 };
	}

	const yCoords = teeth.map((t) => t.cy).sort((a, b) => a - b);
	const medianY = yCoords[Math.floor(yCoords.length / 2)] ?? imgHeight / 2.0;
	const minY = yCoords[0]!;
	const maxY = yCoords[yCoords.length - 1]!;

	if (maxY - minY < imgHeight * 0.15) {
		if (medianY < imgHeight * 0.5) {
			return { upper: teeth, lower: [], splitY: imgHeight * 0.5 };
		}
		return { upper: [], lower: teeth, splitY: imgHeight * 0.5 };
	}

	let upper = teeth.filter((t) => t.cy < medianY);
	let lower = teeth.filter((t) => t.cy >= medianY);

	if (upper.length > 0 && lower.length > 0) {
		const upperMeanY = upper.reduce((sum, t) => sum + t.cy, 0) / upper.length;
		const lowerMeanY = lower.reduce((sum, t) => sum + t.cy, 0) / lower.length;
		const refinedSplitY = (upperMeanY + lowerMeanY) / 2.0;
		upper = teeth.filter((t) => t.cy < refinedSplitY);
		lower = teeth.filter((t) => t.cy >= refinedSplitY);
		return { upper, lower, splitY: refinedSplitY };
	}

	return { upper, lower, splitY: medianY };
}
