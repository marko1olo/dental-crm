import React from "react";
import {
	DENTAL_LAB_CONSTRUCTIONS,
	CANONICAL_LAB_WORK_TYPES,
	type DentalLabConstructionType,
} from "../components/lab/dentalLabDefinitions";
import { DentalLabOrdersView } from "../components/dental-lab/DentalLabOrdersView";
import {
	LabActionPromptModal,
	type LabPromptDialogState,
} from "../components/lab/LabActionPromptModal";
import {
	LabAttachScanModal,
	type LabAttachScanModalProps,
	is3DScanUrl,
} from "../components/lab/LabAttachScanModal";
import { LabOrderCard } from "../components/lab/LabOrderCard";
import {
	DentalLabReadyInClinicModal,
	type ReadyInClinicLabOrder,
} from "../components/lab/DentalLabReadyInClinicModal";

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

export {
	LabActionPromptModal,
	type LabPromptDialogState,
	LabAttachScanModal,
	type LabAttachScanModalProps,
	is3DScanUrl,
	LabOrderCard,
	DentalLabReadyInClinicModal,
	type ReadyInClinicLabOrder,
};

/**
 * Главная страница реестра заказов в зуботехническую лабораторию (ЗТЛ).
 * Делегирует основной рабочий сценарий декомпозированному каноническому мастер-компоненту DentalLabOrdersView.
 */
export function LabOrdersPage() {
	return <DentalLabOrdersView />;
}

export default LabOrdersPage;
