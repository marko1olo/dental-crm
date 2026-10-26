import type { BeforeAfterComparisonPair } from "./patientWebappPlanTypes";

export function calculateSplitClipPath(
	percent: number,
	direction: "vertical" | "horizontal" = "vertical",
): string {
	const p = Math.max(0, Math.min(100, percent));
	if (direction === "vertical") {
		return `polygon(${p}% 0%, 100% 0%, 100% 100%, ${p}% 100%)`;
	}
	return `polygon(0% ${p}%, 100% ${p}%, 100% 100%, 0% 100%)`;
}

export function calculateWiperPointerPercent(
	pointerClientCoord: { clientX: number; clientY: number },
	containerRect: { left: number; top: number; width: number; height: number },
	direction: "vertical" | "horizontal" = "vertical",
): number {
	if (direction === "vertical") {
		if (containerRect.width <= 0) return 50;
		const rel = pointerClientCoord.clientX - containerRect.left;
		const pct = (rel / containerRect.width) * 100;
		return Math.round(Math.max(0, Math.min(100, pct)));
	}
	if (containerRect.height <= 0) return 50;
	const rel = pointerClientCoord.clientY - containerRect.top;
	const pct = (rel / containerRect.height) * 100;
	return Math.round(Math.max(0, Math.min(100, pct)));
}

export function getPresetBeforeAfterGalleries(patientId: string): readonly BeforeAfterComparisonPair[] {
	return [
		{
			id: `ba-veneer-${patientId}`,
			titleRu: "Эстетическая реставрация фронтальной группы (VITA A3.5 -> BL2)",
			clinicalIndicationRu: "К03.8 Другие уточненные болезни твердых тканей зубов (дисколорит, клиновидные дефекты 1.1, 2.1)",
			procedureNameRu: "Керамические виниры E.max CAD под микроскопом (зубы 1.2, 1.1, 2.1, 2.2)",
			toothFdi: "11, 21",
			defaultSplitPercent: 50,
			doctorNotesRu: "Выполнена предварительная гигиена, микропрепарирование 0.3 мм, фиксация на адгезив Variolink Esthetic.",
			beforeSlot: {
				slotId: "slot-front-before",
				labelRu: "До лечения (Исходный цвет A3.5)",
				angle: "frontal_smile",
				imageUrl: "",
				timestampIso: "2026-06-15T11:30:00Z",
				vitaShade: "A3.5",
			},
			afterSlot: {
				slotId: "slot-front-after",
				labelRu: "После фиксации виниров (Цвет BL2)",
				angle: "frontal_smile",
				imageUrl: "",
				timestampIso: "2026-08-20T16:00:00Z",
				vitaShade: "BL2",
			},
		},
		{
			id: `ba-hygiene-${patientId}`,
			titleRu: "Комплексная профессиональная гигиена и AirFlow",
			clinicalIndicationRu: "К05.1 Хронический простой гингивит, обильный поддесневой и наддесневой зубной камень",
			procedureNameRu: "Ультразвуковой скейлинг Cavitron + AirFlow порошком глицина + ремотерапия",
			defaultSplitPercent: 50,
			doctorNotesRu: "Купировано воспаление маргинальной десны, индекс гигиены Грина-Вермиллиона снижен с 2.4 до 0.2.",
			beforeSlot: {
				slotId: "slot-hygiene-before",
				labelRu: "До гигиены (Зубные отложения)",
				angle: "retractor_12oclock",
				imageUrl: "",
				timestampIso: "2026-07-02T10:00:00Z",
				vitaShade: "A3",
			},
			afterSlot: {
				slotId: "slot-hygiene-after",
				labelRu: "После полировки и AirFlow",
				angle: "retractor_12oclock",
				imageUrl: "",
				timestampIso: "2026-07-02T11:15:00Z",
				vitaShade: "A1",
			},
		},
	];
}
