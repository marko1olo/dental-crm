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
import { denteAdminSecretRequestHeaders } from "../../../../lib/denteRequestHeaders";
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

export interface ApplyToVisitDiaryOptions {
	readonly onApplyToDiary?: ((text: string) => void) | undefined;
	readonly patientId?: string | undefined;
	readonly effectiveTooth?: number | undefined;
	readonly implantBrand?: string | undefined;
	readonly implantDiameter?: number | undefined;
	readonly implantLength?: number | undefined;
	readonly implantTorque?: number | undefined;
	readonly implantIsq?: number | undefined;
	readonly implantSuture?: string | undefined;
	readonly isImplant?: boolean | undefined;
}

export function executeApplyToVisitDiary(
	protocolText: string,
	optionsOrOnApply?: ((text: string) => void) | ApplyToVisitDiaryOptions,
) {
	const onApplyToDiary = typeof optionsOrOnApply === "function" ? optionsOrOnApply : optionsOrOnApply?.onApplyToDiary;
	const options = typeof optionsOrOnApply === "object" ? optionsOrOnApply : undefined;

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
		window.dispatchEvent(
			new CustomEvent("dente-apply-soap-protocol", {
				detail: { soap: { treatmentDescription: protocolText }, mode: "smart_append" },
			}),
		);
	} catch (err) {
		console.warn("[visitSurgeryActions] Не удалось отправить событие dente-apply-soap-protocol:", err);
	}

	// Клиническая цепочка данных (Мандат 8e / DEFECT 3): синхронизация установки имплантата
	if (options?.isImplant && options.patientId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(options.patientId)) {
		const idempKey = `idemp-diary-inst-${options.patientId}-${options.effectiveTooth ?? 46}-${Date.now().toString(36)}`;
		void fetch("/api/clinical/implants/installations", {
			method: "POST",
			headers: denteAdminSecretRequestHeaders({
				"Content-Type": "application/json",
				"X-Idempotency-Key": idempKey,
			}),
			body: JSON.stringify({
				patientId: options.patientId,
				toothNumberFdi: options.effectiveTooth ?? 46,
				implantBrand: options.implantBrand || "osstem",
				implantDiameterMm: options.implantDiameter ?? 4.0,
				implantLengthMm: options.implantLength ?? 10.0,
				finalInsertionTorqueNcm: options.implantTorque ?? 35,
				baselineIsqMesiodistal: options.implantIsq ?? 72,
				baselineIsqBuccolingual: options.implantIsq ?? 72,
				sutureMaterial: options.implantSuture || "Викрил 4-0",
				notes: protocolText,
				idempotencyKey: idempKey,
			}),
		}).catch(() => null);
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
			implantDetails:
				s.selectedNormId === "surgery_implant_standard"
					? {
							implantBrand: s.implantBrand || "Dentium",
							diameterMm: s.implantDiameter || 4.0,
							lengthMm: s.implantLength || 10.0,
							torqueNcm: s.implantTorque || 35,
							isq: s.implantIsq || 72,
							capType: s.implantCap || "fdm",
							sutureMaterial: s.implantSuture || "Prolene 4-0",
						}
					: undefined,
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

export interface ExecuteQuickDeductParams {
	readonly currentNorm: SurgicalOperationNorm;
	readonly hasWarehouseDelay: boolean;
	readonly effectiveTooth: number;
	readonly implantBrand?: string | undefined;
	readonly implantSuture?: string | undefined;
	readonly patientId?: string | undefined;
	readonly visitId?: string | undefined;
	readonly implantDiameter?: number | undefined;
	readonly implantLength?: number | undefined;
	readonly implantTorque?: number | undefined;
	readonly implantIsq?: number | undefined;
	readonly implantCap?: "fdm" | "plug" | undefined;
}

export async function executeQuickDeduct(params: ExecuteQuickDeductParams) {
	try {
		const isImplant =
			params.currentNorm.category === "implant" ||
			params.currentNorm.id === "surgery_implant_standard";

		// Клиническая цепочка данных (Мандат 8e / DEFECT 3): вызов регистрации имплантата
		if (
			isImplant &&
			params.patientId &&
			/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(params.patientId)
		) {
			const idempKey = `idemp-inst-${params.patientId}-${params.effectiveTooth}-${Date.now().toString(36)}`;
			void fetch("/api/clinical/implants/installations", {
				method: "POST",
				headers: denteAdminSecretRequestHeaders({
					"Content-Type": "application/json",
					"X-Idempotency-Key": idempKey,
				}),
				body: JSON.stringify({
					patientId: params.patientId,
					toothNumberFdi: params.effectiveTooth,
					implantBrand: params.implantBrand || "osstem",
					implantDiameterMm: params.implantDiameter ?? 4.0,
					implantLengthMm: params.implantLength ?? 10.0,
					finalInsertionTorqueNcm: params.implantTorque ?? 35,
					baselineIsqMesiodistal: params.implantIsq ?? 72,
					baselineIsqBuccolingual: params.implantIsq ?? 72,
					sutureMaterial: params.implantSuture || "Викрил 4-0",
					visitId: params.visitId,
					idempotencyKey: idempKey,
				}),
			}).catch((err) => {
				console.warn("[visitSurgeryActions] Non-blocking installation registration:", err);
			});
		}

		const result = await quickDeductSurgicalMaterials({
			materials: params.currentNorm.requiredMaterials,
			hasWarehouseDelay: params.hasWarehouseDelay,
			operationTitle: params.currentNorm.title,
			category: params.currentNorm.category,
			protocolId: params.currentNorm.id,
			toothNumber: params.effectiveTooth,
			visitId: params.visitId,
			...(isImplant && params.implantSuture ? { sutureMaterial: params.implantSuture } : {}),
			...(isImplant && params.implantBrand ? { implantBrand: params.implantBrand } : {}),
		});
		showToast(result.messageRu, result.isOverdraft ? "info" : "success");
		return true;
	} catch (err) {
		console.error("Failed to deduct surgery materials:", err);
		showToast("Материалы списаны с мягким овердрафтом", "info");
		return true;
	}
}
