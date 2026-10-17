import type { OpgPathologyDetection } from "../opgTopologicalEngine";
import { LIODON_CLASSES } from "./types";

export function calculateIoU(
	boxA: { x1: number; y1: number; x2: number; y2: number },
	boxB: { x1: number; y1: number; x2: number; y2: number },
): number {
	const interX1 = Math.max(boxA.x1, boxB.x1);
	const interY1 = Math.max(boxA.y1, boxB.y1);
	const interX2 = Math.min(boxA.x2, boxB.x2);
	const interY2 = Math.min(boxA.y2, boxB.y2);

	const interW = Math.max(0, interX2 - interX1);
	const interH = Math.max(0, interY2 - interY1);
	const interArea = interW * interH;
	if (interArea <= 0) return 0;

	const areaA = Math.max(0, boxA.x2 - boxA.x1) * Math.max(0, boxA.y2 - boxA.y1);
	const areaB = Math.max(0, boxB.x2 - boxB.x1) * Math.max(0, boxB.y2 - boxB.y1);
	const unionArea = areaA + areaB - interArea;
	return unionArea > 0 ? interArea / unionArea : 0;
}

export function applyNms(
	detections: OpgPathologyDetection[],
	iouThreshold = 0.45,
): OpgPathologyDetection[] {
	if (detections.length <= 1) return detections;
	const sorted = [...detections].sort((a, b) => b.confidence - a.confidence);
	const selected: OpgPathologyDetection[] = [];

	for (const candidate of sorted) {
		let shouldSelect = true;
		for (const current of selected) {
			if (candidate.label === current.label) {
				const iou = calculateIoU(candidate, current);
				if (iou > iouThreshold) {
					shouldSelect = false;
					break;
				}
			}
		}
		if (shouldSelect) selected.push(candidate);
	}
	return selected;
}

export function decodeYolo11Output(
	outputData: Float32Array | number[],
	originalWidth: number,
	originalHeight: number,
	confidenceThreshold = 0.25,
	iouThreshold = 0.45,
): OpgPathologyDetection[] {
	const numAnchors = 8400;
	const numChannels = 7;
	const inputSize = 640;
	if (outputData.length < numChannels * numAnchors) return [];

	const scaleX = originalWidth / inputSize;
	const scaleY = originalHeight / inputSize;
	const candidates: OpgPathologyDetection[] = [];

	for (let a = 0; a < numAnchors; a++) {
		const pCaries = outputData[4 * numAnchors + a] ?? 0;
		const pPeriapical = outputData[5 * numAnchors + a] ?? 0;
		const pImpacted = outputData[6 * numAnchors + a] ?? 0;

		let maxProb = pCaries;
		let classIndex = 0;
		if (pPeriapical > maxProb) { maxProb = pPeriapical; classIndex = 1; }
		if (pImpacted > maxProb) { maxProb = pImpacted; classIndex = 2; }

		if (maxProb >= confidenceThreshold) {
			const cx = (outputData[0 * numAnchors + a] ?? 0) * scaleX;
			const cy = (outputData[1 * numAnchors + a] ?? 0) * scaleY;
			const w = (outputData[2 * numAnchors + a] ?? 0) * scaleX;
			const h = (outputData[3 * numAnchors + a] ?? 0) * scaleY;
			const label = LIODON_CLASSES[classIndex] ?? "caries";

			candidates.push({
				id: `pathology-${label}-${a}-${Math.round(maxProb * 100)}`,
				label,
				confidence: Math.round(maxProb * 1000) / 1000,
				x1: Math.max(0, Math.round(cx - w / 2)),
				y1: Math.max(0, Math.round(cy - h / 2)),
				x2: Math.min(originalWidth, Math.round(cx + w / 2)),
				y2: Math.min(originalHeight, Math.round(cy + h / 2)),
				cx: Math.round(cx),
				cy: Math.round(cy),
			});
		}
	}
	return applyNms(candidates, iouThreshold);
}
