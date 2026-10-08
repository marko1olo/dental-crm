/**
 * @file apps/web/src/helpers/clinicalCalculations.ts
 * @description Decomposed helper module extracted verbatim from AppHelpers.tsx
 */

import {
	type Dashboard,
	type OdontogramViewMode,
	type TreatmentPlanAcceptanceVariant,
	type VisitNoteDraft,
} from "@dental/shared";
import {
	clinicalRuleActionLabels,
	clinicalRuleSeverityLabels,
} from "../workspaceUiLabels";
import {
	isNullableString,
	isRecordKey,
	isStringUnionValue,
} from "./guardUtils";
import {
	type ClinicalToothStatus,
	type ClinicalToothSurface,
	type VisitNoteField,
	type VisitNoteForm,
} from "./types";

export const toothRows = [
	[
		"18",
		"17",
		"16",
		"15",
		"14",
		"13",
		"12",
		"11",
		"21",
		"22",
		"23",
		"24",
		"25",
		"26",
		"27",
		"28",
	],
	[
		"48",
		"47",
		"46",
		"45",
		"44",
		"43",
		"42",
		"41",
		"31",
		"32",
		"33",
		"34",
		"35",
		"36",
		"37",
		"38",
	],
] as const;

export const toothStateByCode: Record<
	string,
	"watch" | "planned" | "done" | "missing"
> = {
	"16": "watch",
	"26": "done",
	"36": "planned",
	"46": "watch",
	"48": "missing",
};

export const visitNoteFieldDefinitions: Array<{
	key: VisitNoteField;
	label: string;
}> = [
	{ key: "complaint", label: "Жалобы" },
	{ key: "anamnesis", label: "Анамнез" },
	{ key: "objectiveStatus", label: "Объективно" },
	{ key: "diagnosis", label: "Диагноз" },
	{ key: "treatmentPlan", label: "План" },
];

export const visitDraftQualityLabels: Record<
	NonNullable<VisitNoteDraft["quality"]>["level"],
	string
> = {
	ready: "Черновик плотный",
	review: "Нужна проверка",
	needs_more_dictation: "Нужно дописать",
};

export const visitDraftSignalLabels: Record<string, string> = {
	complaint_detected: "жалобы есть",
	anamnesis_detected: "анамнез есть",
	objective_detected: "осмотр есть",
	diagnosis_mentioned: "диагноз есть",
	plan_detected: "план есть",
	tooth_codes_detected: "зуб указан",
	imaging_mentioned: "снимки упомянуты",
	consent_mentioned: "согласие упомянуто",
	medical_risk_mentioned: "есть медриск",
	procedure_mentioned: "процедура упомянута",
};

export const visitDraftMissingFieldLabels: Record<string, string> = {
	complaint: "жалобы",
	anamnesis: "анамнез",
	objective_status: "объективный статус",
	diagnosis_review: "диагноз",
	treatment_plan: "план лечения",
	tooth_or_region: "зуб или область",
};

export function visitDraftSignalLabel(signal: string) {
	return visitDraftSignalLabels[signal] ?? signal.replace(/_/g, " ");
}

export function visitDraftMissingFieldLabel(field: string) {
	return visitDraftMissingFieldLabels[field] ?? field.replace(/_/g, " ");
}

export function visitNoteFormFromVisit(
	visit: Dashboard["activeVisit"],
): VisitNoteForm {
	return {
		complaint: visit?.complaint ?? "",
		anamnesis: visit?.anamnesis ?? "",
		objectiveStatus: visit?.objectiveStatus ?? "",
		diagnosis: visit?.diagnosis ?? "",
		treatmentPlan: visit?.treatmentPlan ?? "",
	};
}

export function visitNoteFormFromDraft(draft: VisitNoteDraft): VisitNoteForm {
	return {
		complaint: draft.complaint ?? "",
		anamnesis: draft.anamnesis ?? "",
		objectiveStatus: draft.objectiveStatus ?? "",
		diagnosis: draft.diagnosis ?? "",
		treatmentPlan: draft.treatmentPlan ?? "",
	};
}

export function visitNoteDraftFromForm(
	form: VisitNoteForm,
	warnings: string[],
): VisitNoteDraft {
	return {
		complaint: form.complaint,
		anamnesis: form.anamnesis,
		objectiveStatus: form.objectiveStatus,
		diagnosis: form.diagnosis,
		treatmentPlan: form.treatmentPlan,
		warnings,
	};
}

export const treatmentAcceptanceVariantOptions: readonly TreatmentPlanAcceptanceVariant[] =
	["urgent", "standard", "optimal", "staged", "maintenance", "other"];

export const clinicalToothSurfaceAliases: Record<string, ClinicalToothSurface> =
	{
		o: "occlusal",
		окклюзионная: "occlusal",
		окклюзионно: "occlusal",
		жевательная: "occlusal",
		жевательно: "occlusal",
		m: "mesial",
		медиальная: "mesial",
		мезиальная: "mesial",
		медиально: "mesial",
		мезиально: "mesial",
		d: "distal",
		дистальная: "distal",
		дистально: "distal",
		b: "buccal",
		щечная: "buccal",
		щечно: "buccal",
		вестибулярная: "buccal",
		l: "lingual",
		язычная: "lingual",
		язычно: "lingual",
		p: "palatal",
		небная: "palatal",
		небно: "palatal",
		i: "incisal",
		режущий: "incisal",
		"режущий край": "incisal",
		корень: "root",
		корневая: "root",
		root: "root",
		имплантация: "implant_site",
		"зона имплантации": "implant_site",
		"implant site": "implant_site",
		"не применимо": "not_applicable",
		нет: "not_applicable",
		"-": "not_applicable",
	};

export const clinicalToothStatusAliases: Record<string, ClinicalToothStatus> = {
	норма: "sound",
	"без патологии": "sound",
	наблюдение: "watch",
	контроль: "watch",
	кариес: "caries",
	caries: "caries",
	пульпит: "pulpitis_periodontitis",
	периодонтит: "pulpitis_periodontitis",
	эндо: "pulpitis_periodontitis",
	пародонт: "periodontal",
	пародонтология: "periodontal",
	отсутствует: "missing",
	удален: "missing",
	удаленый: "missing",
	удаленный: "missing",
	имплант: "implant",
	имплантат: "implant",
	ортопедия: "prosthetic",
	коронка: "prosthetic",
	протез: "prosthetic",
	ортодонтия: "orthodontic",
	брекеты: "orthodontic",
	элайнеры: "orthodontic",
	план: "planned",
	planned: "planned",
	запланировано: "planned",
	выполнено: "completed",
	completed: "completed",
	готово: "completed",
	иное: "other",
	другое: "other",
};

export function isOdontogramViewModePreference(
	value: unknown,
): value is OdontogramViewMode {
	return (
		value === "anatomical_svg" ||
		value === "compact_clinical" ||
		value === "classic_gost"
	);
}

export function normalizedTreatmentPlanAcceptanceVariant(
	value: unknown,
): TreatmentPlanAcceptanceVariant {
	return isStringUnionValue(value, treatmentAcceptanceVariantOptions)
		? value
		: "standard";
}

export function normalizedClinicalRuleAction(
	value: unknown,
): Dashboard["clinicalRules"][number]["action"] {
	return isRecordKey(value, clinicalRuleActionLabels)
		? value
		: "add_required_service";
}

export function normalizedClinicalRuleSeverity(
	value: unknown,
): Dashboard["clinicalRules"][number]["severity"] {
	return isRecordKey(value, clinicalRuleSeverityLabels) ? value : "warning";
}

export function isVisitNoteForm(value: unknown): value is VisitNoteForm {
	if (!value || typeof value !== "object") return false;
	const candidate = value as Partial<Record<VisitNoteField, unknown>>;
	return visitNoteFieldDefinitions.every(
		({ key }) => typeof candidate[key] === "string",
	);
}

export function isVisitNoteDraft(value: unknown): value is VisitNoteDraft {
	if (!value || typeof value !== "object") return false;
	const candidate = value as Partial<VisitNoteDraft>;
	return (
		isNullableString(candidate.complaint) &&
		isNullableString(candidate.anamnesis) &&
		isNullableString(candidate.objectiveStatus) &&
		isNullableString(candidate.diagnosis) &&
		isNullableString(candidate.treatmentPlan) &&
		Array.isArray(candidate.warnings) &&
		candidate.warnings.every((warning) => typeof warning === "string")
	);
}
