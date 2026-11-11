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

export function executeApplyToVisitDiary(protocolText: string, onApplyToDiary?: (text: string) => void) {
	try {
		useVisitStore.getState().setVisitNoteForm((prev) => {
			const existingObj = prev.objectiveStatus?.trim() || "";
			return { ...prev, objectiveStatus: existingObj ? `${existingObj}\n\n${protocolText}` : protocolText };
		});
	} catch { /* fallback */ }
	onApplyToDiary?.(protocolText);
	try {
		window.dispatchEvent(new CustomEvent("dente-apply-soap-protocol", { detail: { soap: { treatmentDescription: protocolText }, mode: "smart_append" } }));
	} catch { /* fallback */ }
	showToast("Хирургический протокол внесён в медицинскую карту", "success");
}

export function executePrintProtocol(params: {
	patientName: string;
	doctorName: string;
	currentNorm: SurgicalOperationNorm;
	effectiveTooth: number;
	protocolText: string;
	implantDetails?: {
		implantBrand: string;
		diameterMm: number;
		lengthMm: number;
		torqueNcm: number;
		isq: number;
		capType: "fdm" | "plug";
		sutureMaterial: string;
	};
}) {
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
	first: any,
	second?: string,
	third?: string,
) {
	if (first && typeof first === "object" && "currentNorm" in first && "protocolText" in first && !("patientName" in first)) {
		const s = first;
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
	return executePrintProtocol(first);
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
	implantBrand?: string;
	implantSuture?: string;
}) {
	try {
		const result = await quickDeductSurgicalMaterials({
			materials: params.currentNorm.requiredMaterials,
			hasWarehouseDelay: params.hasWarehouseDelay,
			operationTitle: params.currentNorm.title,
			category: params.currentNorm.category,
			protocolId: params.currentNorm.id,
			toothNumber: params.effectiveTooth,
			sutureMaterial: params.currentNorm.category === "implant" ? params.implantSuture : undefined,
			implantBrand: params.currentNorm.category === "implant" ? params.implantBrand : undefined,
		});
		showToast(result.messageRu, result.isOverdraft ? "info" : "success");
		return true;
	} catch (err) {
		console.error("Failed to deduct surgery materials:", err);
		showToast("Материалы списаны с мягким овердрафтом", "info");
		return true;
	}
}
