/**
 * clinicalSoapFormat.ts
 * Formats SOAP diary text from presets and applies them to visit notes.
 */

import { getToothAnatomicalDescription } from "../emr/templates/clinicalDiaryTemplatesEngine";
import type { ClinicalSoapPreset, ClinicalService804n, ClinicalMaterialDeduction } from "./clinicalSoapTypes.js";

export interface FormattedSoapResult {
	readonly complaint: string;
	readonly anamnesis: string;
	readonly objectiveStatus: string;
	readonly diagnosis: string;
	readonly treatmentPlan: string;
	readonly recommendations?: string;
	readonly billLine: string;
	readonly materialsSummary: string;
	readonly service804n?: ClinicalService804n;
	readonly materialsToDeduct: readonly ClinicalMaterialDeduction[];
}

export function formatSoapFromPreset(
	preset: ClinicalSoapPreset,
	targetTooth?: number | null,
	customAnestheticText?: string,
): FormattedSoapResult {
	const anatDesc = targetTooth ? getToothAnatomicalDescription(targetTooth) : "";
	const anatStr = anatDesc ? ` (${anatDesc})` : "";
	const toothSuffix = preset.category !== "hygiene" && targetTooth ? ` (Зуб ${targetTooth}${anatStr})` : "";
	const toothPrefix = preset.category !== "hygiene" && targetTooth ? `Зуб ${targetTooth}: ` : "";

	const cleanComplaint = preset.complaint || preset.anamnesis;
	const cleanAnamnesis = preset.anamnesis;
	const formattedStatus = `${toothPrefix}${preset.statusLocalis}`;
	const formattedDiagnosis = preset.icd10Label
		? `${preset.icd10} ${preset.icd10Label}${toothSuffix}`
		: `${preset.icd10} ${preset.title}${toothSuffix}`;

	let billLine = "";
	if (preset.service804n) {
		billLine = `Выполнено: [${preset.service804n.code804n}] ${preset.service804n.title}${toothSuffix} — ${preset.service804n.basePriceRub.toLocaleString("ru-RU")} ₽`;
	}

	const materialsList = preset.materialsToDeduct ?? [];
	const materialsSummary = materialsList.length > 0
		? materialsList.map((m) => `${m.name} (${m.quantity} ${m.unit})`).join("; ")
		: "Расходные материалы по клиническому регламенту";

	const materialsLine = materialsList.length > 0
		? `Списание со склада (Норма расхода): ${materialsSummary}`
		: "";

	const fullPlanText = [customAnestheticText, preset.treatmentDescription, billLine, materialsLine]
		.filter(Boolean)
		.join("\n\n");

	return {
		complaint: cleanComplaint,
		anamnesis: cleanAnamnesis,
		objectiveStatus: formattedStatus,
		diagnosis: formattedDiagnosis,
		treatmentPlan: fullPlanText,
		recommendations: preset.recommendations || "",
		billLine,
		materialsSummary,
		service804n: preset.service804n,
		materialsToDeduct: materialsList,
	};
}

export function applyClinicalPresetToVisitNote<T extends Record<string, any>>(
	visitNoteForm: T,
	preset: ClinicalSoapPreset,
	options?: {
		readonly targetTooth?: number | null;
		readonly mode?: "clean_replace" | "smart_append";
		readonly customAnestheticText?: string;
	},
): T {
	const tooth = options?.targetTooth ?? preset.defaultTooth ?? 16;
	const mode = options?.mode ?? "clean_replace";
	const formatted = formatSoapFromPreset(preset, tooth, options?.customAnestheticText);

	if (mode === "clean_replace") {
		return {
			...visitNoteForm,
			complaint: formatted.complaint,
			anamnesis: formatted.anamnesis,
			objectiveStatus: formatted.objectiveStatus,
			diagnosis: formatted.diagnosis,
			treatmentPlan: formatted.treatmentPlan,
		};
	}

	const appendField = (current: any, addition: string, separator = "\n\n"): string => {
		const base = typeof current === "string" ? current.trim() : "";
		if (!base) return addition;
		if (base.includes(addition)) return base;
		return `${base}${separator}${addition}`;
	};

	return {
		...visitNoteForm,
		complaint: appendField(visitNoteForm.complaint, formatted.complaint),
		anamnesis: appendField(visitNoteForm.anamnesis, formatted.anamnesis),
		objectiveStatus: appendField(visitNoteForm.objectiveStatus, formatted.objectiveStatus),
		diagnosis: appendField(visitNoteForm.diagnosis, formatted.diagnosis, ", "),
		treatmentPlan: appendField(visitNoteForm.treatmentPlan, formatted.treatmentPlan),
	};
}
