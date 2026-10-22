import {
	generateMdlpSchema10560Payload,
	MDLP_OPERATION_CONFIGS,
	type MdlpCarpuleQueueItem,
	type MdlpOperationCode,
	type MdlpSchema10560Document,
} from "@dental/shared";
import { showToast } from "../../GlobalToast.js";
import { executeSeniorNurseDisposalActInBackground } from "./SeniorNurseDisposalActModal.js";

export async function submitMdlpDisposalBatch({
	organizationId,
	organizationName,
	doctorName,
	docNum,
	docDate,
	reason,
	patientId,
	visitId,
	doctorId,
	operationCode,
	items,
}: {
	organizationId: string;
	organizationName: string;
	doctorName: string;
	docNum: string;
	docDate: string;
	reason: string;
	patientId?: string | undefined;
	visitId?: string | undefined;
	doctorId?: string | undefined;
	operationCode: MdlpOperationCode;
	items: readonly MdlpCarpuleQueueItem[];
}): Promise<MdlpSchema10560Document> {
	const opConfig = MDLP_OPERATION_CONFIGS[operationCode];
	const schemaDoc = generateMdlpSchema10560Payload({
		subjectId: organizationId,
		docNum,
		docDate,
		withdrawalType: opConfig.schema10560WithdrawalType,
		patientId: patientId ?? null,
		visitId: visitId ?? null,
		doctorId: doctorId ?? null,
		items: items.map((it) => ({
			sgtin: it.sgtin,
			gtin: it.gtin,
			serialNumber: it.serialNumber,
			series: it.series,
			lot: it.series,
			expirationDate: it.expirationDate,
			costRub: it.costRub,
			tradeName: it.drugInfo?.tradeName,
			inn: it.drugInfo?.inn,
		})),
		notes: reason,
	});

	try {
		const res = await fetch("/api/mdlp/dispose-batch", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				docNum,
				docDate,
				reason,
				patientId: patientId ?? null,
				visitId: visitId ?? null,
				doctorId: doctorId ?? null,
				items: items.map((it) => ({
					sgtin: it.sgtin,
					gtin: it.gtin,
					serialNumber: it.serialNumber,
					series: it.series,
					lot: it.series,
					costRub: it.costRub,
					tradeName: it.drugInfo?.tradeName,
					inn: it.drugInfo?.inn,
					reason,
				})),
			}),
		});
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		showToast(`Списание по Схеме 10560 успешно зарегистрировано в МДЛП (${items.length} поз.)`, "info");
	} catch {
		showToast(`Сформирован официальный XML документ Схемы 10560 для МДЛП (${items.length} поз.)`, "info");
	}

	try {
		await executeSeniorNurseDisposalActInBackground({
			items,
			organizationName,
			approverName: doctorName,
			approverRole: "doctor",
			notes: `Фоновое списание (${docNum})`,
		});
	} catch {}

	return schemaDoc;
}
