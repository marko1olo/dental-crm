import { ALL_FDI_SLOTS, type OpgAnalysisResult, type OpgPathologyDetection, type OpgToothDetection, type OpgToothSlot } from "./types";
import { detectDentalMidline, partitionUpperLowerJaws } from "./anchors";
import { assignQuadrantSlots } from "./quadrantSlots";
import { fusePathologiesToSlots } from "./pathologyFusion";

export function calculateOpgOdontogram(
	toothDetections: OpgToothDetection[],
	pathologyDetections: OpgPathologyDetection[] = [],
	imgWidth = 1024,
	_imgHeight = 600,
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

	fusePathologiesToSlots(slots, pathologyDetections, midlineX, splitY);

	let missingCount = 0;
	let impactedCount = 0;
	let pathCount = 0;
	for (const fdi of ALL_FDI_SLOTS) {
		const s = slots[fdi]!;
		if (s.status === "Missing") missingCount++;
		if (s.status === "Retained") impactedCount++;
		if (s.pathologies.length > 0) pathCount++;
	}

	const dateStr = new Date().toLocaleDateString("ru-RU");
	const missingList = ALL_FDI_SLOTS.filter((fdi) => slots[fdi]!.status === "Missing");
	const impactedList = ALL_FDI_SLOTS.filter((fdi) => slots[fdi]!.status === "Retained");
	const perioList = ALL_FDI_SLOTS.filter((fdi) => slots[fdi]!.status === "Periodontitis");
	const cariesList = ALL_FDI_SLOTS.filter((fdi) => slots[fdi]!.status === "Caries");

	const protocol043Ru = `ПРОТОКОЛ АНАЛИЗА ОРТОПАНТОМОГРАММЫ (ОПТГ)
(Медицинская карта пациента)
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
