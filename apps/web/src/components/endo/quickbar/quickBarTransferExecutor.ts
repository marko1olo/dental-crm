import type { EndoCanalData } from "@dental/shared";
import { showToast } from "../../GlobalToast";
import { useVisitStore } from "../../../store/visitStore";
import {
	calculateEndoBillingAndMaterialsEstimate,
	type EndoStageStamp,
	type EndoToothClinicalData,
} from "../endoCanalConstants";
import {
	applyEndoBillingAndInventoryDeductions,
	persistCanalsToBackend,
} from "../endoPersistenceBridge";
import type { QuickCanalState } from "./types";
import { generateSoapEndoProtocol } from "./soapGenerator";

export interface ExecuteTransferParams {
	activeTooth: number;
	toothAnatomicalName: string;
	toothState?: string | undefined;
	canals: QuickCanalState[];
	patientId?: string | undefined;
	onInsertToDiary?: ((soapText: string, canals: EndoCanalData[]) => void) | undefined;
}

export function executeChairsideTransferToDiary({
	activeTooth,
	toothAnatomicalName,
	toothState,
	canals,
	patientId,
	onInsertToDiary,
}: ExecuteTransferParams): void {
	const isRetreatment = canals.some((c) => c.isRetreatment);
	const isTemp = isRetreatment || canals.every((c) => c.obturationType === "temp_caoh2");
	const isBio = canals.some((c) => c.obturationType === "bioceramic");
	const stageStamp: EndoStageStamp = isTemp ? "TEMP_CAOH2" : "COMPLETED";
	const soapProtocol = generateSoapEndoProtocol({ activeTooth, toothAnatomicalName, currentCanals: canals, toothState });

	try {
		useVisitStore.getState().setVisitNoteForm((prev) => ({
			...prev,
			objectiveStatus: prev.objectiveStatus?.trim() ? `${prev.objectiveStatus.trim()}\n\n${soapProtocol}` : soapProtocol,
			treatmentPlan: prev.treatmentPlan?.trim() ? `${prev.treatmentPlan.trim()}\nЭндо зуба #${activeTooth}` : `Эндо зуба #${activeTooth}`,
		}));
	} catch { /* safe */ }

	// Диспатч глобального кросс-синхронного события для SOAP-редакторов визита
	try {
		window.dispatchEvent(
			new CustomEvent("dente-apply-soap-protocol", {
				detail: {
					soap: {
						treatmentDescription: soapProtocol,
						objectiveStatus: soapProtocol,
					},
					mode: "smart_append",
				},
			}),
		);
	} catch { /* fallback */ }

	const sharedCanals: EndoCanalData[] = canals.map((c) => ({
		id: c.id, canalName: c.name, referencePoint: "Бугор", workingLengthMm: c.isObliterated ? 0 : (c.workingLengthMm || 21.0),
		masterApicalFile: c.masterApicalFile || "#25", taper: c.taper || ".04", isObliterated: Boolean(c.isObliterated),
		obturationTechnique: c.isRetreatment ? "Временная обтурация Ca(OH)2 (после распломбировки)" : c.obturationType === "temp_caoh2" ? "Временная обтурация Ca(OH)2" : c.obturationType === "bioceramic" ? "Биокерамика (гуттаперча + биокерамический силер)" : "Латеральная компакция",
		sealer: c.sealer || (c.isRetreatment || c.obturationType === "temp_caoh2" ? "Каласепт (Ca(OH)2)" : c.obturationType === "bioceramic" ? "Биокерамика (BioRoot)" : "AH Plus"),
	}));

	try {
		const billingEstimate = calculateEndoBillingAndMaterialsEstimate({
			toothNumber: activeTooth,
			canals: sharedCanals,
			stageStamp,
			isRetreatment,
			obturationTechnique: isTemp ? "Временная обтурация Ca(OH)2" : isBio ? "Биокерамика (гуттаперча + биокерамический силер)" : "Гуттаперча + Силер (AH Plus)",
			sealer: canals[0]?.sealer || "AH Plus",
		});
		applyEndoBillingAndInventoryDeductions(activeTooth, patientId, stageStamp, billingEstimate);
	} catch { /* soft */ }

	if (patientId) {
		const clinicalData: EndoToothClinicalData = { toothNumber: activeTooth, canals: sharedCanals, irrigation: "3% NaOCl + 17% EDTA с УЗ-активацией", rotarySystem: isRetreatment ? "Распломбировка D-RaCe / ProTaper Retreatment" : "Машинная обработка NiTi", radiologyControl: isTemp ? "Контрольная визиография: временное пломбирование Ca(OH)2 до апекса под герметичный Септопак." : "Контрольная визиография: каналы гомогенно обтурированы до апекса.", updatedAt: new Date().toISOString() };
		persistCanalsToBackend({ patientId, activeTooth, clinicalData }).catch(() => {});
	}
	if (onInsertToDiary) onInsertToDiary(soapProtocol, sharedCanals);
	showToast(`Протокол эндодонтии зуба #${activeTooth} перенесён в дневник!`, "success", 3000);
}
