import type React from "react";
import type { ToothClinicalServicePayload } from "@dental/shared";

export type ClinicalTabType = "diagnosis" | "therapy" | "endo" | "surgery";

export interface VisitClinicalToothModalProps {
	// biome-ignore lint/suspicious/noExplicitAny: selection
	selectedToothForMenu: any;
	closeClinicalModal: () => void;
	toothStateByCode: Record<string, string>;
	materialCategory: string | null;
	setMaterialCategory: (v: string | null) => void;
	handleSelectDiagnosis: (state: string, text?: string, field?: string) => void;
	handleSelectSurface: (surf: string) => void;
	selectedSurfaces: string[];
	isSurfaceMode: boolean;
	setIsSurfaceMode: React.Dispatch<React.SetStateAction<boolean>>;
	setEndoModalToothNumber: (v: number | string | null) => void;
	setEndoModalToothState: (v: string) => void;
	setIsEndoModalOpen: (v: boolean) => void;
	appendToEMKField: (field: string, text: string) => void;
	setLabOrderModalToothNumber: (v: number | string | null) => void;
	setIsLabOrderModalOpen: (v: boolean) => void;
	// biome-ignore lint/suspicious/noExplicitAny: warnings
	visitWarnings?: any[];
	onAddServiceToTooth?: ((service: ToothClinicalServicePayload) => void) | undefined;
}

export function getToothStatusMeta(state: string) {
	if (state === "treatment") return { label: "Лечение", dot: "bg-red-500", color: "text-red-500" };
	if (state === "watch") return { label: "Кариес", dot: "bg-amber-500", color: "text-amber-500" };
	if (state === "done") return { label: "Санирован", dot: "bg-emerald-500", color: "text-emerald-500" };
	if (state === "missing") return { label: "Удалён", dot: "bg-slate-400", color: "text-slate-400" };
	return { label: "Интактен", dot: "bg-emerald-500", color: "text-emerald-600" };
}
