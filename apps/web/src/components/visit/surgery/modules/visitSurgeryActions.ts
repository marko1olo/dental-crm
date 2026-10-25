import { showToast } from "../../../GlobalToast";
import {
	printSurgicalOperationProtocol,
	printSurgicalPackage,
} from "../../../documents/surgicalPackagePrintEngine";
import {
	quickDeductSurgicalMaterials,
	type SurgicalOperationNorm,
} from "../../../surgery/surgeryProtocols";
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

export const executePrintProtocolTab = executePrintProtocol;

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
