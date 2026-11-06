/**
 * clinicalDigestConstants.ts
 * Clinical constants and normalization helpers for CopilotVisitClinicalDigest.
 * Mandates 8b (file size sweet spot) & 8e (doctor autonomy).
 */

import type { ToothState } from "../../../store/visit/types";

export interface FindingItem {
	tooth: number;
	state: ToothState;
	stateTitle: string;
	icd10: string;
	diagnosisLabel: string;
	treatmentSummary: string;
	priceKopecks: number;
}

export const normalizeToothStateKey = (st: string): string => {
	const s = (st || "").toLowerCase().trim();
	if (s.includes("caries") || s.includes("кариес")) return "caries";
	if (s.includes("pulpit") || s.includes("пульпит")) return "pulpitis";
	if (s.includes("periodont") || s.includes("периодонтит")) return "periodontitis";
	if (s.includes("crown") || s.includes("коронк") || s.includes("протез")) return "crown";
	if (s.includes("implant") || s.includes("имплант")) return "implant";
	if (s.includes("missing") || s.includes("отсутств") || s.includes("удал") || s.includes("extract")) return "missing";
	if (s.includes("defect") || s.includes("дефект")) return "defective_restoration";
	if (s.includes("fill") || s.includes("пломб") || s.includes("done") || s.includes("санир")) return "done";
	if (s.includes("treatment") || s.includes("лечен")) return "treatment";
	return s;
};

export const TOOTH_STATE_NAMES: Record<string, { title: string; icd10: string; treatment: string; priceKopecks: number }> = {
	caries: {
		title: "Кариес дентина",
		icd10: "K02.1",
		treatment: "Препарирование, изолирующая прокладка, реставрация нанокомпозитом",
		priceKopecks: 650000,
	},
	pulpitis: {
		title: "Пульпит",
		icd10: "K04.0",
		treatment: "Эндодонтическая обработка, ирригация NaOCl, обтурация каналов",
		priceKopecks: 1250000,
	},
	periodontitis: {
		title: "Периодонтит",
		icd10: "K04.5",
		treatment: "Распломбировка, антисептическая обработка, временная кальций-содержащая паста",
		priceKopecks: 1400000,
	},
	treatment: {
		title: "Лечение / Пульпит",
		icd10: "K04.0",
		treatment: "Инструментальная и медикаментозная обработка корневых каналов",
		priceKopecks: 1100000,
	},
	crown: {
		title: "Коронка",
		icd10: "Z96.5",
		treatment: "Препарирование под коронку, снятие оттисков / сканирование",
		priceKopecks: 2400000,
	},
	implant: {
		title: "Имплантат",
		icd10: "Z96.5",
		treatment: "Дентальная имплантация, установка формирователя десны",
		priceKopecks: 4500000,
	},
	defective_restoration: {
		title: "Дефект пломбы",
		icd10: "K02.1",
		treatment: "Удаление несостоятельной реставрации, повторное пломбирование нанокомпозитом",
		priceKopecks: 550000,
	},
	missing: {
		title: "Отсутствует",
		icd10: "K08.1",
		treatment: "Консультация по протезированию / имплантации",
		priceKopecks: 0,
	},
	done: {
		title: "Пломба / Санирован",
		icd10: "Z96.5",
		treatment: "Шлифовка, полировка реставрации, контроль окклюзии",
		priceKopecks: 150000,
	},
};
