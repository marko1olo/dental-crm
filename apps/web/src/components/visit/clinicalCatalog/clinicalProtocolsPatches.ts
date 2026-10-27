/**
 * apps/web/src/components/visit/clinicalCatalog/clinicalProtocolsPatches.ts
 * Генерация патчей полей дневника приёма (Мандат 8b, <= 120 строк).
 */

import type {
	ClinicalChunk1142,
	GroupedClinicalProcedure,
	VisitNoteFieldsPatch,
} from "./clinicalProtocolsTypes";

export function appendClinicalText(
	existing: string | undefined | null,
	addition: string,
	separator = "\n",
): string {
	const cur = (existing ?? "").trim();
	const add = addition.trim();
	if (!add) return cur;
	if (!cur) return add;
	if (cur.includes(add)) return cur;
	return `${cur}${separator}${add}`;
}

export function buildProcedureVisitNotePatch(
	procedure: GroupedClinicalProcedure,
	currentForm: Record<string, any> = {},
	targetTooth?: number | null,
): VisitNoteFieldsPatch {
	const toothPrefix = targetTooth ? `Зуб ${targetTooth}: ` : "";
	const patch: VisitNoteFieldsPatch = {};

	if (procedure.complaints?.text) {
		patch.complaint = appendClinicalText(currentForm.complaint, procedure.complaints.text);
	}
	if (procedure.anamnesis?.text) {
		patch.anamnesis = appendClinicalText(currentForm.anamnesis, procedure.anamnesis.text);
	}
	if (procedure.objective?.text) {
		patch.objectiveStatus = appendClinicalText(currentForm.objectiveStatus, `${toothPrefix}${procedure.objective.text}`);
	}
	if (procedure.treatment?.text) {
		patch.treatmentPlan = appendClinicalText(currentForm.treatmentPlan, `${toothPrefix}${procedure.treatment.text}`);
	} else if (procedure.fullTemplate?.text) {
		patch.treatmentPlan = appendClinicalText(currentForm.treatmentPlan, `${toothPrefix}${procedure.fullTemplate.text}`);
	}
	if (procedure.recommendations?.text) {
		patch.recommendations = appendClinicalText(currentForm.recommendations, procedure.recommendations.text);
	}
	if (procedure.matchedIcd10) {
		const newDiag = targetTooth ? `${procedure.matchedIcd10} (зуб ${targetTooth})` : procedure.matchedIcd10;
		patch.diagnosis = appendClinicalText(currentForm.diagnosis, newDiag, "; ");
	}

	return patch;
}

export function buildChunkVisitNotePatch(
	chunk: ClinicalChunk1142,
	currentForm: Record<string, any> = {},
	targetTooth?: number | null,
): VisitNoteFieldsPatch {
	const toothPrefix = targetTooth ? `Зуб ${targetTooth}: ` : "";
	const patch: VisitNoteFieldsPatch = {};

	switch (chunk.chunkType) {
		case "complaints":
			patch.complaint = appendClinicalText(currentForm.complaint, chunk.text);
			break;
		case "anamnesis":
			patch.anamnesis = appendClinicalText(currentForm.anamnesis, chunk.text);
			break;
		case "objective":
			patch.objectiveStatus = appendClinicalText(currentForm.objectiveStatus, `${toothPrefix}${chunk.text}`);
			break;
		case "treatment":
		case "full":
			patch.treatmentPlan = appendClinicalText(currentForm.treatmentPlan, `${toothPrefix}${chunk.text}`);
			break;
		case "recommendations":
			patch.recommendations = appendClinicalText(currentForm.recommendations, chunk.text);
			break;
		case "diagnosis": {
			const newDiag = targetTooth ? `${chunk.name} (зуб ${targetTooth})` : chunk.name;
			patch.diagnosis = appendClinicalText(currentForm.diagnosis, newDiag, "; ");
			break;
		}
		default:
			patch.treatmentPlan = appendClinicalText(currentForm.treatmentPlan, `${toothPrefix}${chunk.text}`);
			break;
	}
	return patch;
}

export function extractFdiToothFromText(text: string): number | null {
	const patterns = [
		/(?:зуб[аеы]?\s*#?\s*)(\d{2})\b/i,
		/(?:на|для|област[иь]|в)\s*#?(\d{2})\b/i,
		/\b(\d{2})\s*(?:зуб[аеы]?|-?[йяе] зуб[аеы]?)\b/i,
		/#(\d{2})\b/,
		/\b([1-8][1-8])\b/,
	];

	for (const pattern of patterns) {
		const match = text.match(pattern);
		if (match && match[1]) {
			const num = Number(match[1]);
			const isValid =
				(num >= 11 && num <= 18) || (num >= 21 && num <= 28) ||
				(num >= 31 && num <= 38) || (num >= 41 && num <= 48) ||
				(num >= 51 && num <= 55) || (num >= 61 && num <= 65) ||
				(num >= 71 && num <= 75) || (num >= 81 && num <= 85);
			if (isValid) return num;
		}
	}
	return null;
}
