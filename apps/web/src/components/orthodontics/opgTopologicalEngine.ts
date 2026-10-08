/**
 * DENTE CRM — Anchor-Guided Topological OPG Graph Matching Engine
 * 
 * Implements robust 2-stage panoramic dental arch reconstruction:
 * 1. Anatomical Anchor decomposition (Dental Midline X=0, Maxillary vs Mandibular Occlusal divide).
 * 2. Quadrant Partitioning (Q1=18..11, Q2=21..28, Q3=31..38, Q4=41..48).
 * 3. Topological Slot Assignment with Inter-Centroid Metric Gap Detection.
 *    -> Solves the "Rotten Seed" of naive sorting: prevents index-shift cascades when teeth are extracted or missing!
 * 4. Clinical Pathology Fusion (Impacted wisdom teeth, periapical lesions, caries).
 * 5. Direct Form 043/y (Форма 043/у Приказ МЗ РФ 834н) odontogram state generator.
 */

import type { ToothState } from "../odontogram/ToothChart";

export interface Point2D {
	x: number;
	y: number;
}

export interface OpgToothDetection {
	id: number | string;
	x1: number;
	y1: number;
	x2: number;
	y2: number;
	cx: number;
	cy: number;
	width: number;
	height: number;
	confidence: number;
}

export type OpgPathologyType = "impacted_tooth" | "periapical_lesion" | "caries" | "bone_loss";

export interface OpgPathologyDetection {
	id: number | string;
	label: OpgPathologyType;
	confidence: number;
	x1: number;
	y1: number;
	x2: number;
	y2: number;
	cx: number;
	cy: number;
}

export interface OpgToothSlot {
	fdi: number;
	quadrant: 1 | 2 | 3 | 4;
	slotNumber: number; // 1 (Central Incisor) .. 8 (Wisdom tooth)
	status: ToothState;
	toothDetection?: OpgToothDetection;
	pathologies: OpgPathologyDetection[];
	clinicalDescriptionRu: string;
}

export interface OpgAnalysisResult {
	midlineX: number;
	splitY: number;
	teeth: Record<number, OpgToothSlot>;
	totalTeethDetected: number;
	missingTeethCount: number;
	impactedTeethCount: number;
	pathologiesCount: number;
	protocol043Ru: string;
	timestamp: string;
}

export const ALL_FDI_SLOTS: number[] = [
	18, 17, 16, 15, 14, 13, 12, 11,
	21, 22, 23, 24, 25, 26, 27, 28,
	48, 47, 46, 45, 44, 43, 42, 41,
	31, 32, 33, 34, 35, 36, 37, 38,
];

/**
 * Calculates dental midline (vertical line X=0 between central incisors).
 */
export function detectDentalMidline(
	teeth: OpgToothDetection[],
	imgWidth: number,
): number {
	if (!teeth || teeth.length === 0) {
		return imgWidth / 2.0;
	}

	// Sort teeth by proximity to image horizontal center
	const halfW = imgWidth / 2.0;
	const centralCandidates = [...teeth].sort(
		(a, b) => Math.abs(a.cx - halfW) - Math.abs(b.cx - halfW),
	);

	// Central incisors typically form pairs near halfW
	if (centralCandidates.length >= 2) {
		const t1 = centralCandidates[0]!;
		const t2 = centralCandidates[1]!;
		// If they bracket the center or are adjacent
		if (Math.abs(t1.cx - t2.cx) < imgWidth * 0.15) {
			return (t1.cx + t2.cx) / 2.0;
		}
	}

	return centralCandidates[0]?.cx ?? halfW;
}

/**
 * Partitions tooth detections into Upper Jaw (Maxilla) and Lower Jaw (Mandible).
 */
export function partitionUpperLowerJaws(
	teeth: OpgToothDetection[],
): { upper: OpgToothDetection[]; lower: OpgToothDetection[]; splitY: number } {
	if (!teeth || teeth.length === 0) {
		return { upper: [], lower: [], splitY: 0 };
	}

	const yCoords = teeth.map((t) => t.cy).sort((a, b) => a - b);
	const medianY = yCoords[Math.floor(yCoords.length / 2)] ?? 0;

	// Initial split around median
	let upper = teeth.filter((t) => t.cy < medianY);
	let lower = teeth.filter((t) => t.cy >= medianY);

	// Refine boundary using means of the two clusters
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

/**
 * Assigns teeth in a single quadrant (1..8 slots) from Midline outwards.
 * Detects metric gaps (extracted teeth) to prevent index-shift errors.
 */
export function assignQuadrantSlots(
	teeth: OpgToothDetection[],
	quadrant: 1 | 2 | 3 | 4,
	midlineX: number,
): Map<number, OpgToothDetection> {
	const assignments = new Map<number, OpgToothDetection>();
	if (!teeth || teeth.length === 0) {
		return assignments;
	}

	// In panoramic X-ray:
	// Q1 (Upper Right) & Q4 (Lower Right) are on the LEFT side of image (X < midlineX).
	// Moving from Midline outwards means moving RIGHT-to-LEFT (decreasing X).
	// Q2 (Upper Left) & Q3 (Lower Left) are on the RIGHT side of image (X >= midlineX).
	// Moving from Midline outwards means moving LEFT-to-RIGHT (increasing X).
	const sorted = [...teeth].sort((a, b) => {
		if (quadrant === 1 || quadrant === 4) {
			return b.cx - a.cx; // closer to midline first
		} else {
			return a.cx - b.cx; // closer to midline first
		}
	});

	// Estimate inter-tooth spacing within this quadrant using both deltas and tooth widths
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

	// Effective spacing across full arch is calibrated to natural dental proportions (24px incisors to 40px molars, avg ~34px)
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
			// If gap is noticeably larger than typical spacing (>= 1.7x), a tooth was extracted/missing!
			const jump = Math.round(dist / effectiveSpacing);
			if (jump > 1) {
				currentSlot += (jump - 1);
			}
		}

		if (currentSlot > 8) {
			currentSlot = 8; // Cap at wisdom tooth slot
		}

		const fdi = quadrant * 10 + currentSlot;
		assignments.set(fdi, tooth);
		currentSlot++;
	}

	return assignments;
}

/**
 * Fuses pathology detections (Liodon: impacted_tooth, periapical_lesion, caries)
 * with anatomical tooth slots.
 */
export function fusePathologiesToSlots(
	slots: Record<number, OpgToothSlot>,
	pathologies: OpgPathologyDetection[],
	midlineX = 512,
	splitY = 300,
): void {
	if (!pathologies || pathologies.length === 0) return;

	for (const p of pathologies) {
		// Find closest tooth slot
		let bestFdi: number | null = null;
		let minDistance = Infinity;

		for (const slotKey of Object.keys(slots)) {
			const fdi = Number(slotKey);
			const slot = slots[fdi]!;
			if (slot.toothDetection) {
				const dx = p.cx - slot.toothDetection.cx;
				const dy = p.cy - slot.toothDetection.cy;
				const dist = Math.sqrt(dx * dx + dy * dy);

				// Max association radius: 2.0x tooth height
				if (dist < minDistance && dist < slot.toothDetection.height * 2.0) {
					minDistance = dist;
					bestFdi = fdi;
				}
			}
		}

		// Fallback for wisdom teeth only if no tooth slot was within range
		if (!bestFdi && p.label === "impacted_tooth") {
			const isRightSide = p.cx < midlineX;
			const isTopSide = p.cy < splitY;
			const targetWisdomFdi = isTopSide
				? (isRightSide ? 18 : 28)
				: (isRightSide ? 48 : 38);

			if (slots[targetWisdomFdi]) {
				bestFdi = targetWisdomFdi;
			}
		}

		if (bestFdi && slots[bestFdi]) {
			const targetSlot = slots[bestFdi]!;
			targetSlot.pathologies.push(p);

			// Update clinical status
			if (p.label === "impacted_tooth") {
				targetSlot.status = "Retained";
				targetSlot.clinicalDescriptionRu = `Ретинированный зуб ${bestFdi} (уверенность ${(p.confidence * 100).toFixed(0)}%)`;
			} else if (p.label === "periapical_lesion" && targetSlot.status !== "Retained") {
				targetSlot.status = "Periodontitis";
				targetSlot.clinicalDescriptionRu = `Периапикальный очаг деструкции кости (Pt)`;
			} else if (p.label === "caries" && targetSlot.status === "Healthy") {
				targetSlot.status = "Caries";
				targetSlot.clinicalDescriptionRu = `Кариозное поражение (C)`;
			}
		}
	}
}

/**
 * Core Orchestrator: Takes raw detections from YOLO models and outputs full clinical OPG analysis.
 */
export function calculateOpgOdontogram(
	toothDetections: OpgToothDetection[],
	pathologyDetections: OpgPathologyDetection[] = [],
	imgWidth = 1024,
	imgHeight = 600,
): OpgAnalysisResult {
	const midlineX = detectDentalMidline(toothDetections, imgWidth);
	const { upper, lower, splitY } = partitionUpperLowerJaws(toothDetections);

	const q1Teeth = upper.filter((t) => t.cx < midlineX);
	const q2Teeth = upper.filter((t) => t.cx >= midlineX);
	const q4Teeth = lower.filter((t) => t.cx < midlineX);
	const q3Teeth = lower.filter((t) => t.cx >= midlineX);

	const q1Assignments = assignQuadrantSlots(q1Teeth, 1, midlineX);
	const q2Assignments = assignQuadrantSlots(q2Teeth, 2, midlineX);
	const q3Assignments = assignQuadrantSlots(q3Teeth, 3, midlineX);
	const q4Assignments = assignQuadrantSlots(q4Teeth, 4, midlineX);

	// Initialize all 32 adult tooth slots
	const slots: Record<number, OpgToothSlot> = {};

	for (const fdi of ALL_FDI_SLOTS) {
		const quadrant = Math.floor(fdi / 10) as 1 | 2 | 3 | 4;
		const slotNum = fdi % 10;

		let assignedTooth: OpgToothDetection | undefined;
		if (quadrant === 1) assignedTooth = q1Assignments.get(fdi);
		else if (quadrant === 2) assignedTooth = q2Assignments.get(fdi);
		else if (quadrant === 3) assignedTooth = q3Assignments.get(fdi);
		else if (quadrant === 4) assignedTooth = q4Assignments.get(fdi);

		slots[fdi] = {
			fdi,
			quadrant,
			slotNumber: slotNum,
			status: assignedTooth ? "Healthy" : "Missing",
			toothDetection: assignedTooth,
			pathologies: [],
			clinicalDescriptionRu: assignedTooth ? "Интактен (0)" : "Отсутствует (X)",
		};
	}

	// Fuse pathologies
	fusePathologiesToSlots(slots, pathologyDetections, midlineX, splitY);

	// Count statistics
	let missingCount = 0;
	let impactedCount = 0;
	let pathCount = 0;

	for (const fdi of ALL_FDI_SLOTS) {
		const s = slots[fdi]!;
		if (s.status === "Missing") missingCount++;
		if (s.status === "Retained") impactedCount++;
		if (s.pathologies.length > 0) pathCount++;
	}

	// Generate Form 043/y Protocol text
	const dateStr = new Date().toLocaleDateString("ru-RU");
	const missingList = ALL_FDI_SLOTS.filter((fdi) => slots[fdi]!.status === "Missing");
	const impactedList = ALL_FDI_SLOTS.filter((fdi) => slots[fdi]!.status === "Retained");
	const perioList = ALL_FDI_SLOTS.filter((fdi) => slots[fdi]!.status === "Periodontitis");
	const cariesList = ALL_FDI_SLOTS.filter((fdi) => slots[fdi]!.status === "Caries");

	const protocol043Ru = `ПРОТОКОЛ АНАЛИЗА ОРТОПАНТОМОГРАММЫ (ОПТГ)
(Медицинская карта стоматологического пациента · Форма 043/у)
Дата исследования: ${dateStr}

1. Общая характеристика зубных рядов:
• Обнаружено зубов в зубной дуге: ${toothDetections.length} из 32
• Отсутствующие зубы (адентия/удаление): ${missingList.length > 0 ? missingList.join(", ") : "зубные ряды непрерывны"}

2. Выявленные патологии и аномалии положения:
• Ретенированные / дистопированные зубы: ${impactedList.length > 0 ? impactedList.join(", ") : "не выявлено"}
• Периапикальные очаги деструкции костной ткани: ${perioList.length > 0 ? perioList.join(", ") : "периапикальных изменений не выявлено"}
• Кариозные поражения / дефекты: ${cariesList.length > 0 ? cariesList.join(", ") : "кариозных дефектов на скрининге не выявлено"}

ЗАКЛЮЧЕНИЕ ОПТГ:
${impactedList.length > 0 ? `Ретенция зубов: ${impactedList.join(", ")}. ` : ""}${missingList.length > 0 ? `Дефекты зубных рядов (отсутствуют: ${missingList.join(", ")}). ` : ""}${perioList.length > 0 ? `Хронический периодонтит в области: ${perioList.join(", ")}. ` : ""}Рекомендована очная верификация врачом и составление комплексного плана лечения.`;

	return {
		midlineX,
		splitY,
		teeth: slots,
		totalTeethDetected: toothDetections.length,
		missingTeethCount: missingCount,
		impactedTeethCount: impactedCount,
		pathologiesCount: pathCount,
		protocol043Ru,
		timestamp: new Date().toISOString(),
	};
}
