import { showToast } from "../../../GlobalToast";
import {
	printSurgicalOperationProtocol,
	printSurgicalPackage,
} from "../../../documents/surgicalPackagePrintEngine";
import {
	quickDeductSurgicalMaterials,
	type SurgicalOperationNorm,
} from "../../../surgery/surgeryCatalogData";
import { useVisitStore } from "../../../../store/visitStore";
import type { useVisitSurgeryState } from "./useVisitSurgeryState";

export interface PrintProtocolParams {
	readonly patientName: string;
	readonly doctorName: string;
	readonly currentNorm: SurgicalOperationNorm;
	readonly effectiveTooth: number;
	readonly protocolText: string;
	readonly implantDetails?: {
		readonly implantBrand: string;
		readonly diameterMm: number;
		readonly lengthMm: number;
		readonly torqueNcm: number;
		readonly isq: number;
		readonly capType: "fdm" | "plug";
		readonly sutureMaterial: string;
	} | undefined;
}

export function executeApplyToVisitDiary(protocolText: string, onApplyToDiary?: (text: string) => void) {
	try {
		useVisitStore.getState().setVisitNoteForm((prev) => {
			const existingObj = prev.objectiveStatus?.trim() || "";
			return { ...prev, objectiveStatus: existingObj ? `${existingObj}\n\n${protocolText}` : protocolText };
		});
	} catch (err) {
		console.warn("[visitSurgeryActions] Не удалось обновить заметки визита в visitStore:", err);
	}
	onApplyToDiary?.(protocolText);
	try {
		window.dispatchEvent(new CustomEvent("dente-apply-soap-protocol", { detail: { soap: { treatmentDescription: protocolText }, mode: "smart_append" } }));
	} catch (err) {
		console.warn("[visitSurgeryActions] Не удалось отправить событие dente-apply-soap-protocol:", err);
	}
	showToast("Хирургический протокол внесён в медицинскую карту", "success");
}

export function executePrintProtocol(params: PrintProtocolParams) {
	printSurgicalOperationProtocol({
		patient: { fullName: params.patientName },
		doctorFullName: params.doctorName,
		operationType: params.currentNorm.title,
		toothNumber: params.effectiveTooth,
		protocolText: params.protocolText,
		diagnosis: params.currentNorm.title,
		mkb10: params.currentNorm.icd10,
		surgeryDetails: params.implantDetails,
		isSignedByDoctor: false,
	});
	showToast("Протокол операции отправлен на печать", "info");
}

export function executePrintProtocolTab(
	first: PrintProtocolParams | ReturnType<typeof useVisitSurgeryState>,
	second?: string,
	third?: string,
) {
	if (first && typeof first === "object" && "currentNorm" in first && "protocolText" in first && !("patientName" in first)) {
		const s = first as ReturnType<typeof useVisitSurgeryState>;
		return executePrintProtocol({
			patientName: second || "Пациент",
			doctorName: third || "Врач-хирург",
			currentNorm: s.currentNorm,
			effectiveTooth: s.effectiveTooth ?? 46,
			protocolText: s.protocolText || "",
			implantDetails: s.selectedNormId === "surgery_implant_standard" ? {
				implantBrand: s.implantBrand || "Dentium",
				diameterMm: s.implantDiameter || 4.0,
				lengthMm: s.implantLength || 10.0,
				torqueNcm: s.implantTorque || 35,
				isq: s.implantIsq || 72,
				capType: s.implantCap || "fdm",
				sutureMaterial: s.implantSuture || "Prolene 4-0",
			} : undefined,
		});
	}
	return executePrintProtocol(first as PrintProtocolParams);
}

export function executePrintIds(patientName: string, doctorName: string, normTitle: string, effectiveTooth: number) {
	printSurgicalPackage({
		patient: { fullName: patientName },
		clinic: null,
		doctorFullName: doctorName,
		operationDetails: { operationType: normTitle, toothNumber: effectiveTooth },
	});
	showToast("Хирургический комплект ИДС отправлен на печать", "info");
}

export async function executeQuickDeduct(params: {
	currentNorm: SurgicalOperationNorm;
	hasWarehouseDelay: boolean;
	effectiveTooth: number;
	implantBrand?: string | undefined;
	implantSuture?: string | undefined;
}) {
	try {
		const result = await quickDeductSurgicalMaterials({
			materials: params.currentNorm.requiredMaterials,
			hasWarehouseDelay: params.hasWarehouseDelay,
			operationTitle: params.currentNorm.title,
			category: params.currentNorm.category,
			protocolId: params.currentNorm.id,
			toothNumber: params.effectiveTooth,
			...(params.currentNorm.category === "implant" && params.implantSuture ? { sutureMaterial: params.implantSuture } : {}),
			...(params.currentNorm.category === "implant" && params.implantBrand ? { implantBrand: params.implantBrand } : {}),
		});
		showToast(result.messageRu, result.isOverdraft ? "info" : "success");
		return true;
	} catch (err) {
		console.error("Failed to deduct surgery materials:", err);
		showToast("Материалы списаны с мягким овердрафтом", "info");
		return true;
	}
}
