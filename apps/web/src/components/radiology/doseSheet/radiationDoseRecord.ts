import { getStatutoryDosePreset } from "./radiationDosePresets.js";
import type { DoseRecord } from "./types.js";

export function extractYear(dateStr: string, fallbackYear: number): number {
	if (!dateStr) return fallbackYear;
	const match = dateStr.match(/^(\d{4})/);
	if (match?.[1]) {
		const y = Number.parseInt(match[1], 10);
		if (!Number.isNaN(y) && y >= 1990 && y <= 2100) return y;
	}
	return fallbackYear;
}

export function normalizeDoseRecord(
	record: Partial<DoseRecord>,
	index = 0,
): DoseRecord {
	const preset = getStatutoryDosePreset(
		record.modalityId || "visiography_intraoral",
	);
	const rawMicrosv =
		typeof record.effectiveDoseMicrosv === "number" &&
		!Number.isNaN(record.effectiveDoseMicrosv)
			? record.effectiveDoseMicrosv
			: typeof record.effectiveDoseMsv === "number" &&
					!Number.isNaN(record.effectiveDoseMsv)
				? record.effectiveDoseMsv * 1000
				: preset.typicalDoseMicrosv;

	const effectiveDoseMicrosv = Number(rawMicrosv.toFixed(2));
	const effectiveDoseMsv =
		typeof record.effectiveDoseMsv === "number" &&
		!Number.isNaN(record.effectiveDoseMsv)
			? Number(record.effectiveDoseMsv.toFixed(4))
			: Number((effectiveDoseMicrosv / 1000).toFixed(4));

	const nowIso = new Date().toISOString().slice(0, 10);

	return {
		id: record.id || `dose-rec-${Date.now()}-${index}`,
		studyDate: record.studyDate ? String(record.studyDate).trim() : nowIso,
		modalityId: record.modalityId || preset.id,
		modalityLabel: record.modalityLabel || preset.shortNameRu,
		anatomicalArea: record.anatomicalArea || "Область зубов",
		teethFdi: Array.isArray(record.teethFdi) ? record.teethFdi : [],
		apparatusModel:
			record.apparatusModel || "Дентальный цифровой рентген-аппарат",
		tubeVoltageKv: record.tubeVoltageKv ?? preset.defaultKv,
		tubeCurrentMa: record.tubeCurrentMa ?? preset.defaultMa,
		exposureTimeSec: record.exposureTimeSec ?? preset.defaultExposureSec,
		effectiveDoseMicrosv,
		effectiveDoseMsv,
		doctorName: record.doctorName || "Врач-стоматолог",
		doctorSpecialty: record.doctorSpecialty ?? undefined,
		clinicName: record.clinicName ?? undefined,
		protectionEquipmentUsed: record.protectionEquipmentUsed || [
			"Защитный фартук 0.35 мм Pb",
		],
		isEmergencyJustified: Boolean(record.isEmergencyJustified),
		emergencyJustificationReason:
			record.emergencyJustificationReason ?? undefined,
		notes: record.notes ?? undefined,
	};
}

export function createDoseRecord(params: Partial<DoseRecord>): DoseRecord {
	return normalizeDoseRecord(params);
}
