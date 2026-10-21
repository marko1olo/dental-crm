import { normalizeDoseRecord } from "./radiationDoseRecord.js";
import type { DoseRecord } from "./types.js";

export interface CsvExportOptions {
	clinicName?: string | null | undefined;
	patientFullName?: string | null | undefined;
	medicalCardNumber?: string | null | undefined;
	reportingYear?: number | undefined;
	delimiter?: ";" | "," | undefined;
}

export function exportDoseJournalToCsv(
	records: readonly Partial<DoseRecord>[],
	options: CsvExportOptions = {},
): string {
	const delimiter = options.delimiter || ";";
	const normalized = records.map((r, i) => normalizeDoseRecord(r, i));

	const metaLines: string[] = [];
	if (options.patientFullName) {
		metaLines.push(`# Пациент: ${options.patientFullName}`);
	}
	if (options.medicalCardNumber) {
		metaLines.push(`# Номер карты: ${options.medicalCardNumber}`);
	}

	const headers = [
		"Дата исследования",
		"Вид исследования",
		"Область",
		"Зубы (FDI)",
		"Аппарат",
		"Доза (мкЗв)",
		"Доза (мЗв)",
		"Врач",
		"Обоснование врача",
	].join(delimiter);

	const rows = normalized.map((r) => {
		const reason = r.isEmergencyJustified
			? r.emergencyJustificationReason || "По острой боли / Обоснование врача"
			: "Плановое обследование";

		return [
			r.studyDate,
			`"${r.modalityLabel}"`,
			`"${r.anatomicalArea}"`,
			`"${(r.teethFdi || []).join(", ")}"`,
			`"${r.apparatusModel}"`,
			r.effectiveDoseMicrosv,
			r.effectiveDoseMsv,
			`"${r.doctorName}"`,
			`"${reason}"`,
		].join(delimiter);
	});

	return [...metaLines, headers, ...rows].join("\n");
}
