/**
 * apps/web/src/components/settings/doctor/diaryTemplateTags.ts
 *
 * Шаблоны дневников с автозаполнением клинических тегов:
 * {зуб}, {диагноз}, {материал}, {анестезия}, {изоляция}, {бонд}, {протравка}.
 * Decomposed strictly <= 120 lines following Mandate 8b.
 */

import type { DoctorPreferences } from "../../../store/doctorPreferencesStore";
import {
	resolveAdhesiveName,
	resolveAnestheticName,
	resolveCompositeName,
	resolveEtchantName,
	resolveIsolationName,
} from "../protocolSnippetHelpers";

export interface DiaryTemplateTagsContext {
	readonly tooth?: string | number | undefined;
	readonly diagnosis?: string | undefined;
	readonly material?: string | undefined;
	readonly composite?: string | undefined;
	readonly anesthetic?: string | undefined;
	readonly adhesive?: string | undefined;
	readonly isolation?: string | undefined;
	readonly etchant?: string | undefined;
	readonly doctorName?: string | undefined;
}

export interface DiaryTemplateDefinition {
	readonly id: string;
	readonly title: string;
	readonly specialty:
		| "therapist"
		| "surgeon"
		| "orthopedist"
		| "orthodontist"
		| "periodontist"
		| "pediatric";
	readonly specialtyLabel: string;
	readonly defaultIcd10: string;
	readonly complaintTemplate: string;
	readonly objectiveTemplate: string;
	readonly treatmentTemplate: string;
}

export { STATUTORY_DIARY_TEMPLATES } from "./statutoryDiaryTemplates";

/**
 * Подстановка тегов в текст шаблона с сохранением регистра и дефолтными фолбэками.
 */
export function interpolateDiaryTemplateTags(
	templateText: string,
	context: DiaryTemplateTagsContext,
): string {
	if (!templateText) return "";

	const toothVal = context.tooth ? String(context.tooth).trim() : "[зуб]";
	const diagnosisVal = context.diagnosis ? String(context.diagnosis).trim() : "[диагноз]";
	const materialVal = context.material || context.composite || "композит светового отверждения";
	const compositeVal = context.composite || context.material || "композит светового отверждения";
	const anestheticVal = context.anesthetic || "Sol. Articaini 4% cum Epinephrino 1:100 000 — 1.7 мл";
	const adhesiveVal = context.adhesive || "OptiBond FL";
	const isolationVal = context.isolation || "коффердам";
	const etchantVal = context.etchant || "Ultra-Etch 35%";
	const doctorVal = context.doctorName || "Врач-стоматолог";

	return templateText
		.replace(/\{зуб\}|\{tooth\}/gi, toothVal)
		.replace(/\{диагноз\}|\{diagnosis\}/gi, diagnosisVal)
		.replace(/\{материал\}|\{material\}/gi, materialVal)
		.replace(/\{композит\}/gi, compositeVal)
		.replace(/\{анестезия\}|\{анестетик\}|\{anesthetic\}/gi, anestheticVal)
		.replace(/\{изоляция\}|\{коффердам\}|\{isolation\}/gi, isolationVal)
		.replace(/\{бонд\}|\{адгезив\}|\{adhesive\}/gi, adhesiveVal)
		.replace(/\{протравка\}|\{etchant\}/gi, etchantVal)
		.replace(/\{доктор\}|\{врач\}|\{doctor\}/gi, doctorVal);
}

/**
 * Извлечение списка тегов, присутствующих в шаблоне.
 */
export function extractTemplateTags(text: string): string[] {
	if (!text) return [];
	const matches = text.match(/\{[^{}]+\}/g);
	if (!matches) return [];
	return Array.from(new Set(matches.map((m) => m.toLowerCase())));
}

/**
 * Формирование контекста тегов из текущих настроек врача и выбранного зуба/диагноза.
 */
export function buildContextFromDoctorPreferences(
	prefs: Partial<DoctorPreferences>,
	params: { tooth?: string; diagnosis?: string; doctorName?: string } = {},
): DiaryTemplateTagsContext {
	return {
		tooth: params.tooth || "16",
		diagnosis: params.diagnosis || "К02.1 Кариес дентина",
		doctorName: params.doctorName,
		material: resolveCompositeName(prefs.defaultComposite),
		composite: resolveCompositeName(prefs.defaultComposite),
		adhesive: resolveAdhesiveName(prefs.defaultAdhesive),
		anesthetic: resolveAnestheticName(prefs.favoriteAnesthetic),
		isolation: resolveIsolationName(prefs.defaultIsolation),
		etchant: resolveEtchantName(prefs.defaultEtchant),
	};
}
