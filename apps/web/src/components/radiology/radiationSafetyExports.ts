import { dentalRadiologyStudyLabels } from "@dental/shared";
import {
	exportDoseJournalToCsv,
	generateDoseSheetHtml,
} from "./doseSheet/radiationDoseEngine.js";
import type { RadiationSafetyRecord } from "./radiationSafetyTypes.js";

function mapRecords(records: RadiationSafetyRecord[]) {
	return records.map((r) => ({
		id: r.id,
		studyDate: r.studyDate,
		modalityId: r.studyType,
		modalityLabel: dentalRadiologyStudyLabels[r.studyType] || r.studyType,
		anatomicalArea: r.anatomicalArea,
		apparatusModel: r.apparatusName,
		effectiveDoseMsv: r.effectiveDoseMsv,
		effectiveDoseMicrosv: r.effectiveDoseMicrosv,
		doctorName: r.doctorName,
	}));
}

export function exportRadiationDoseCsv(
	records: RadiationSafetyRecord[],
	patientName: string,
	patientCardNumber: string,
	currentYear: number,
) {
	const csv = exportDoseJournalToCsv(mapRecords(records), {
		patientFullName: patientName,
		medicalCardNumber: patientCardNumber,
		reportingYear: currentYear,
	});
	const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.setAttribute(
		"download",
		`radiation_dose_${patientCardNumber}_${currentYear}.csv`,
	);
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}

export function printRadiationDoseSanpin(
	records: RadiationSafetyRecord[],
	patientName: string,
	patientCardNumber: string,
	patientBirthDate: string,
	currentYear: number,
) {
	const html = generateDoseSheetHtml(mapRecords(records), {
		patientFullName: patientName,
		medicalCardNumber: patientCardNumber,
		patientBirthDate,
		reportingYear: currentYear,
	});
	const printWindow = window.open("", "_blank");
	if (printWindow) {
		printWindow.document.write(html);
		printWindow.document.close();
		printWindow.focus();
		setTimeout(() => printWindow.print(), 300);
	}
}
