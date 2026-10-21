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
 * Форматирует идентификатор материала ЗТЛ в понятный клинический термин на русском языке.
 * Запрещает утечку сырых dev-enum вроде crown_emax, pfm_cocr в интерфейс.
 */
export function formatLabMaterial(material?: string | null): string {
	const raw = (material || "").trim();
	if (!raw) return "";
	if (raw in DENTAL_LAB_CONSTRUCTIONS) {
		return (
			DENTAL_LAB_CONSTRUCTIONS[raw as DentalLabConstructionType].defaultMaterialRu ||
			DENTAL_LAB_CONSTRUCTIONS[raw as DentalLabConstructionType].nameRu ||
			DENTAL_LAB_CONSTRUCTIONS[raw as DentalLabConstructionType].shortNameRu
		);
	}
	const map: Record<string, string> = {
		crown_emax: "Керамика IPS e.max Press",
		emax_lithium_disilicate: "Прессованная керамика IPS e.max",
		crown_zirconia: "Диоксид циркония ZrO2",
		zirconia_multilayer: "Диоксид циркония Multi-layer",
		metal_ceramic: "Металлокерамика",
		pfm_cocr: "Металлокерамика CoCr",
		clasp_denture: "Бюгельный сплав CoCr",
		aligner_splint: "Биосовместимый полимер",
		surgical_guide: "Фотополимер 3D",
		crown_temporary: "Временный полимер PMMA",
		pmma_temporary: "Временный полимер PMMA",
		inlay_onlay: "Керамика IPS e.max",
		veneer: "Керамика полевошпатная / e.max",
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
