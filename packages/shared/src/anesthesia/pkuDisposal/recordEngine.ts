/**
 * @dental/shared/anesthesia/pkuDisposal/recordEngine.ts
 * 1-Click Carpule Disposal Record Generators (Mandate 8b, <= 120 lines)
 */

import { ANESTHESIA_DRUG_CATALOG } from "../catalog.js";
import type {
	AnesthesiaPkuDisposalRecord,
	AnesthesiaPkuPresetKey,
} from "../types.js";
import {
	generateAnesthesiaPkuRecordId,
	generateAnesthesiaPkuRecordNumber,
} from "../../utils/idGenerators.js";
import { calculateDefaultCarpuleExpirationDate } from "./expirationValidator.js";
import { ANESTHESIA_PKU_PRESETS } from "./presets.js";

export function createAnesthesiaPkuRecord(
	params: Omit<AnesthesiaPkuDisposalRecord, "id" | "recordNumber"> & {
		id?: string | undefined;
		recordNumber?: string | undefined;
	},
): AnesthesiaPkuDisposalRecord {
	const genId = params.id || generateAnesthesiaPkuRecordId();
	const year = new Date().getFullYear();
	const recordNumber =
		params.recordNumber ||
		generateAnesthesiaPkuRecordNumber(year, {
			seedKey: `${params.patientFullName}:${params.batchNumber}`,
		});

	const medCard = params.medicalCardNumber || params.medicalCardNumber043 || "МК-2026/01";

	return {
		...params,
		id: genId,
		recordNumber,
		medicalCardNumber: medCard,
		medicalCardNumber043: medCard,
		isSoftOverdraft: params.isSoftOverdraft ?? true,
		stockOverdraftAllowed: params.stockOverdraftAllowed ?? true,
	};
}

export function createAnesthesiaPkuFromPreset(
	presetKey: AnesthesiaPkuPresetKey,
	params?: Partial<AnesthesiaPkuDisposalRecord> & {
		referenceDate?: Date | string | undefined;
	},
): AnesthesiaPkuDisposalRecord {
	const preset = ANESTHESIA_PKU_PRESETS[presetKey];
	const refDate = params?.referenceDate
		? typeof params.referenceDate === "string"
			? new Date(params.referenceDate)
			: params.referenceDate
		: new Date();
	const expDate = calculateDefaultCarpuleExpirationDate(preset.expirationOffsetYears, refDate);

	const drugSpec = ANESTHESIA_DRUG_CATALOG[preset.drugId];
	const isDamaged = preset.disposalReason === "damaged_broken" || params?.disposalReason === "damaged_broken";
	const carpulesUsed = params?.carpulesUsedCount ?? (isDamaged ? 0 : preset.carpulesCount);
	const carpulesDisposed = params?.carpulesDisposedCount ?? preset.carpulesCount;
	const volPerCarpule = drugSpec?.standardCarpuleVolumeMl ?? 1.7;
	const volumeMlTotal = params?.volumeMlTotal ?? Number((carpulesUsed * volPerCarpule).toFixed(2));

	const dateIso = refDate.toISOString().slice(0, 10);
	const time = refDate.toTimeString().slice(0, 5);
	const medCard = params?.medicalCardNumber || params?.medicalCardNumber043 || "МК-2026/01";

	return createAnesthesiaPkuRecord({
		dateIso: params?.dateIso ?? dateIso,
		time: params?.time ?? time,
		clinicName: params?.clinicName ?? "Стоматологическая клиника DENTE",
		cabinetNumber: params?.cabinetNumber ?? "1",
		patientFullName: params?.patientFullName ?? "Пациент на приеме (пакетное списание)",
		medicalCardNumber: medCard,
		medicalCardNumber043: medCard,
		doctorFullName: params?.doctorFullName ?? "Лечащий врач-стоматолог",
		nurseFullName: params?.nurseFullName ?? "Медсестра / Ассистент",
		drugId: params?.drugId ?? preset.drugId,
		drugNameRu: params?.drugNameRu ?? preset.drugTradeNameRu,
		activeSubstanceRu: params?.activeSubstanceRu ?? preset.activeSubstanceRu,
		seriesNumber: params?.seriesNumber ?? preset.standardSeriesNumber,
		batchNumber: params?.batchNumber ?? preset.standardBatchNumber,
		expirationDate: params?.expirationDate ?? expDate,
		carpulesUsedCount: carpulesUsed,
		carpulesDisposedCount: carpulesDisposed,
		volumeMlTotal,
		disposalReason: params?.disposalReason ?? preset.disposalReason,
		wasteClass: "class_b_hazardous",
		disinfectionMethod: params?.disinfectionMethod ?? preset.disinfectionMethod ?? "waste_sharps_container_class_b",
		wasteCollectionContainerRu: params?.wasteCollectionContainerRu ?? preset.wasteCollectionContainerRu,
		isSoftOverdraft: true,
		stockOverdraftAllowed: true,
		assistantSignatureConfirmed: params?.assistantSignatureConfirmed ?? preset.assistantSignatureConfirmed,
		notesRu: params?.notesRu ?? preset.notesRu,
		...(params?.disinfectantNameRu ? { disinfectantNameRu: params.disinfectantNameRu } : {}),
		...(params?.disinfectantExposureMinutes ? { disinfectantExposureMinutes: params.disinfectantExposureMinutes } : {}),
		...(params?.id ? { id: params.id } : {}),
		...(params?.recordNumber ? { recordNumber: params.recordNumber } : {}),
	});
}

export const create1ClickAnesthesiaPkuDisposalRecord = createAnesthesiaPkuFromPreset;
