import {
	type OutpatientProtocolTemplate,
	type PopulateTemplateParams,
	populateOutpatientTemplateText,
} from "@dental/shared";
import type { VisitSoapNoteValues } from "./types";

export function buildPopulatedProtocolValues(
	protocol: OutpatientProtocolTemplate,
	params: PopulateTemplateParams,
	prevValues: VisitSoapNoteValues,
	isLocked: boolean,
	mode: "replace" | "append",
): VisitSoapNoteValues {
	const popComplaint = populateOutpatientTemplateText(protocol.complaint, params);
	const popAnamnesis = populateOutpatientTemplateText(protocol.anamnesis, params);
	const popObjective = populateOutpatientTemplateText(protocol.objectiveStatus, params);
	const popDiagnosis = populateOutpatientTemplateText(protocol.diagnosis, params);
	const popTreatment = populateOutpatientTemplateText(protocol.treatmentProtocol, params);
	const popRecs = populateOutpatientTemplateText(protocol.recommendations, params);

	const formattedDiagnosis = `${protocol.mkbCode} ${popDiagnosis}`.trim();
	const dateStr = new Date().toLocaleDateString("ru-RU", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
	const auditStamp = isLocked ? `\n\n[Исправленному верить: ${dateStr}]` : "";

	if (mode === "replace") {
		const preservedAnamnesis =
			prevValues.anamnesis &&
			!prevValues.anamnesis.includes("Соматически здоров") &&
			!prevValues.anamnesis.includes(popAnamnesis)
				? `${prevValues.anamnesis}; ${popAnamnesis}`
				: popAnamnesis;

		return {
			complaint: popComplaint,
			anamnesis: preservedAnamnesis,
			objectiveStatus: popObjective,
			diagnosis: formattedDiagnosis,
			treatmentPlan: `${popTreatment}${auditStamp}`,
			recommendations: popRecs,
			icd10: protocol.mkbCode,
		};
	}

	const appendText = (current?: string, add?: string, sep = "; ") => {
		if (!current || !current.trim()) return add || "";
		if (!add || !add.trim()) return current;
		return `${current}${sep}${add}`;
	};

	return {
		complaint: appendText(prevValues.complaint, popComplaint),
		anamnesis: appendText(prevValues.anamnesis, popAnamnesis),
		objectiveStatus: appendText(prevValues.objectiveStatus, popObjective, "\n"),
		diagnosis: prevValues.diagnosis ? `${prevValues.diagnosis}, ${formattedDiagnosis}` : formattedDiagnosis,
		treatmentPlan: appendText(prevValues.treatmentPlan, `${popTreatment}${auditStamp}`, "\n\n"),
		recommendations: appendText(prevValues.recommendations, popRecs, "\n"),
		icd10: prevValues.icd10 || protocol.mkbCode,
	};
}
