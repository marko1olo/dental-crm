/**
 * dentalLabOrderHelpers.ts — Хелперы названий конструкций, сканов и вспомогательные типы диалогов.
 */

import {
	CANONICAL_LAB_WORK_TYPES,
	DENTAL_LAB_CONSTRUCTIONS,
	type DentalLabConstructionType,
} from "@dental/shared";

export function formatLabConstructionTitle(type?: string | null, material?: string | null): string {
	const raw = (type || material || "").trim();
	if (!raw) return "Конструкция";
	if (raw in DENTAL_LAB_CONSTRUCTIONS) {
		return DENTAL_LAB_CONSTRUCTIONS[raw as DentalLabConstructionType].shortNameRu;
	}
	const fromCatalog = CANONICAL_LAB_WORK_TYPES.find(
		(w) => w.id === raw || w.titleRu.toLowerCase() === raw.toLowerCase(),
	);
	if (fromCatalog) return fromCatalog.titleRu;
	const map: Record<string, string> = {
		crown_zirconia: "Коронка ZrO2",
		crown_emax: "Коронка e.MAX",
		metal_ceramic: "Металлокерамика",
		clasp_denture: "Бюгельный протез",
		aligner_splint: "Каппа / элайнер",
		surgical_guide: "Хирургический шаблон",
	};
	return map[raw] || raw;
}

/**
 * Валидатор URL или имени файла 3D-скана интраорального сканера или фото прикуса
 */
export function is3DScanUrl(url?: string | null): boolean {
	if (!url) return false;
	return /\.(stl|ply|obj|3mf)($|[?#])/i.test(url) || /scan/i.test(url);
}

export interface ReadyInClinicLabOrder {
	readonly id: string;
	readonly orderNumber?: string;
	readonly patientId?: string;
	readonly patientName?: string;
	readonly patientPhone?: string;
	readonly doctorName?: string;
	readonly doctorId?: string;
	readonly toothFdi?: string;
	readonly material?: string;
	readonly colorVita?: string;
	readonly constructionType?: string;
	readonly clinicName?: string;
}

export interface LabPromptDialogState {
	readonly orderId: string;
	readonly orderNumber: string;
	readonly currentStage: string;
	readonly nextStage: string;
	readonly patientName?: string;
	readonly note?: string;
}
